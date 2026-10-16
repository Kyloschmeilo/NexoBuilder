/**
 * The server process: start, stop, console commands, and Nexo's resource pack state read from the console.
 *
 * Nexo builds the pack in the background. A "nexo reload" in the meantime starts a second build in parallel and both
 * fail (e.g. "items.json already exists"), so reloads wait until the current build is done.
 */
import { isNexoReloadCommand, isPlayerName, NEXO_RELOAD_COMMAND, opCommand } from '@resourcepackbuilder/core/testServer/commands';
import { parseServerLogLine } from '@resourcepackbuilder/core/testServer/serverLog';
import { DesktopError, type PackStatus, type TestServerState } from '@resourcepackbuilder/desktop-contract';
import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Readable } from 'node:stream';
import { describeError, t } from '../i18n';
import { ensureJava, type JavaInstallation } from './java';
import { ensurePaper, type PaperInstallation } from './paper';
import { serverDir } from './paths';
import { prepareServerFiles } from './serverFiles';
import { loadConfig, logInfo, publicState, pushLog, saveConfig, setState, state } from './state';

const STOP_TIMEOUT_MS = 45_000;
const PACK_BUILD_TIMEOUT_MS = 3 * 60_000;
/** Pause between a finished pack build and a queued reload, so Nexo has settled. */
const QUEUED_RELOAD_DELAY_MS = 1000;

let serverProcess: ChildProcessWithoutNullStreams | null = null;
let stopRequested = false;
let reloadPending = false;
let packTimer: NodeJS.Timeout | undefined;

/* ------------------------------------------------------------------ resource pack */

function setPack(status: PackStatus, message: string | null = null) {
  clearTimeout(packTimer);
  packTimer = undefined;
  if (status === 'building') {
    packTimer = setTimeout(() => {
      logInfo(t('testServer.packTimeout'));
      setPack('idle');
    }, PACK_BUILD_TIMEOUT_MS);
  }
  setState({ pack: { status, message, at: Date.now() } });
  if (status !== 'building' && reloadPending && state.status === 'running') {
    reloadPending = false;
    setTimeout(requestReload, QUEUED_RELOAD_DELAY_MS);
  }
}

/** Reloads Nexo, or queues the reload while Nexo is still building the resource pack. Returns whether it was sent. */
export function requestReload(): boolean {
  if (state.status !== 'running' || !serverProcess) return false;
  if (state.pack.status === 'building') {
    if (!reloadPending) logInfo(t('testServer.reloadQueued'));
    reloadPending = true;
    return false;
  }
  const sent = sendCommand(NEXO_RELOAD_COMMAND);
  if (sent && state.config.nexoJar) setPack('building', t('testServer.packReloading'));
  return sent;
}

export function isReloadPending(): boolean {
  return reloadPending;
}

/* ------------------------------------------------------------------ console */

function handleLine(line: string) {
  pushLog(line);
  const event = parseServerLogLine(line);
  switch (event?.type) {
    case 'packBuilding':
      if (state.pack.status !== 'building') setPack('building', t('testServer.packBuilding'));
      break;
    case 'packReady':
      setPack('ready', event.url);
      break;
    case 'packFailed':
      setPack('failed', event.message ?? t('testServer.unknownError'));
      break;
    case 'started':
      if (state.status !== 'starting') break;
      setState({ status: 'running', message: null, startedAt: Date.now() });
      if (isPlayerName(state.config.playerName)) sendCommand(opCommand(state.config.playerName));
      break;
    case 'portInUse':
      setState({ message: t('testServer.portInUse', { port: state.config.port }) });
      break;
  }
}

function readLines(stream: Readable, onLine: (line: string) => void) {
  let rest = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => {
    const parts = (rest + chunk).split(/\r?\n/);
    rest = parts.pop() ?? '';
    for (const part of parts) if (part.trim()) onLine(part);
  });
  stream.on('end', () => {
    if (rest.trim()) onLine(rest);
  });
}

/** Sends a console command (without a leading slash). Returns false if the server is not running. */
function sendCommand(command: string): boolean {
  const text = command.replace(/[\r\n]+/g, ' ').trim();
  if (!text || !serverProcess) return false;
  pushLog(`> ${text}`, 'info');
  serverProcess.stdin.write(`${text}\n`);
  return true;
}

/** A command typed by the user; a manual Nexo reload also rebuilds the pack. */
export function runUserCommand(command: string): boolean {
  const sent = sendCommand(command);
  if (sent && state.config.nexoJar && isNexoReloadCommand(command)) {
    setPack('building', t('testServer.packReloading'));
  }
  return sent;
}

/* ------------------------------------------------------------------ start / stop */

/** Ends the bookkeeping for `child` once (it may report both 'error' and 'exit'). */
function processEnded(child: ChildProcess, patch: Partial<TestServerState>) {
  if (serverProcess !== child) return;
  serverProcess = null;
  stopRequested = false;
  reloadPending = false;
  setPack('idle');
  setState({ startedAt: null, progress: null, ...patch });
}

function launch(paper: PaperInstallation, java: JavaInstallation) {
  logInfo(t('testServer.startingPaper', { version: paper.version, java: java.version, ram: state.config.ramGb }));
  reloadPending = false;
  setState({ status: 'starting', message: t('testServer.starting') });
  // Nexo builds the pack on startup; no reload until then
  if (state.config.nexoJar) setPack('building', t('testServer.packBuildingOnStart'));
  else setPack('idle');

  const args = ['-Xms512M', `-Xmx${state.config.ramGb}G`, '-Dfile.encoding=UTF-8', '-jar', paper.jar, '--nogui'];
  const child = spawn(java.path, args, { cwd: serverDir(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  serverProcess = child;
  readLines(child.stdout, handleLine);
  readLines(child.stderr, (line) => pushLog(line, 'err'));
  child.stdin.on('error', () => undefined);
  child.on('error', (err) => {
    const message = t('testServer.startFailed', { error: err.message });
    pushLog(message, 'err');
    processEnded(child, { status: 'error', message });
  });
  child.on('exit', (code) => {
    logInfo(code !== null ? t('testServer.exitedCode', { code }) : t('testServer.exited'));
    const expected = stopRequested || code === 0;
    processEnded(
      child,
      expected
        ? { status: 'stopped', message: null }
        : { status: 'error', message: state.message || t('testServer.crashed', { code: String(code) }) },
    );
  });
}

/** Downloads what is missing, prepares the server folder and starts the server. */
export async function start(): Promise<TestServerState> {
  await loadConfig();
  if (serverProcess || ['preparing', 'starting', 'running', 'stopping'].includes(state.status)) return publicState();
  if (!state.config.eulaAccepted) throw new DesktopError('eulaRequired');
  const { paperVersion } = state.config;
  if (!paperVersion) throw new DesktopError('versionRequired');
  stopRequested = false;
  setState({ status: 'preparing', message: t('testServer.preparing'), progress: null });
  try {
    const paper = await ensurePaper(paperVersion);
    const java = await ensureJava(paper.javaMin);
    state.installed = { paperVersion: paper.version, paperBuild: paper.build, javaPath: java.path, javaVersion: java.version };
    await saveConfig();
    await prepareServerFiles();
    launch(paper, java);
  } catch (err) {
    const message = describeError(err);
    pushLog(message, 'err');
    setState({ status: 'error', message, progress: null });
  }
  return publicState();
}

/** Stops the server with "stop" (saves the world); kills it if it does not exit in time. */
export async function stop(): Promise<void> {
  const child = serverProcess;
  if (!child) {
    if (state.status !== 'stopped') setState({ status: 'stopped', message: null });
    return;
  }
  stopRequested = true;
  setState({ status: 'stopping', message: t('testServer.stopping') });
  sendCommand('stop');
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      pushLog(t('testServer.notResponding'), 'err');
      child.kill('SIGKILL');
      resolve();
    }, STOP_TIMEOUT_MS);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function isRunning(): boolean {
  return serverProcess !== null;
}
