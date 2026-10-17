/**
 * The server process: start, stop, console commands, and the plugin's resource pack state read from the console.
 *
 * Nexo builds the pack in the background. A "nexo reload" in the meantime starts a second build in parallel and both
 * fail (e.g. "items.json already exists"), so reloads wait until the current build is done.
 */
import { DEFAULT_PACK_TARGET, type PackTargetId } from '@resourcepackbuilder/core/project';
import {
  consoleCommandText,
  isPlayerName,
  opCommand,
  parseServerLogLine,
  type ServerAdapter,
  serverAdapterFor,
  tracksPackBuild,
} from '@resourcepackbuilder/test-server';
import { DesktopError, type PackStatus, type TestServerState } from '@resourcepackbuilder/desktop-contract';
import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Readable } from 'node:stream';
import { describeError, t } from '../i18n';
import { ensureJava, type JavaInstallation } from './java';
import { removePidFile, stopOrphanedServers, writePidFile } from './orphan';
import { ensurePaper, type PaperInstallation } from './paper';
import { serverDir } from './paths';
import { prepareServerFiles } from './serverFiles';
import { loadConfig, logInfo, publicState, pushLog, saveConfig, setState, state } from './state';
import { assertPortsFree, setAsideIncompleteWorld } from './world';

const STOP_TIMEOUT_MS = 45_000;
const PACK_BUILD_TIMEOUT_MS = 3 * 60_000;
/** Pause between a finished pack build and a queued reload, so Nexo has settled. */
const QUEUED_RELOAD_DELAY_MS = 1000;

let serverProcess: ChildProcessWithoutNullStreams | null = null;
let stopRequested = false;
let reloadPending = false;
/** Why the running server is shutting down on its own (Paper still exits with code 0 then); null while all is well. */
let failure: string | null = null;
let packTimer: NodeJS.Timeout | undefined;
/** The preparation of a start in progress (downloads ...); `stop()` aborts it and waits for it to end. */
let preparation: { abort: AbortController; done: Promise<unknown> } | null = null;

/** The adapter of the plugin the server runs (or ran last). */
function adapter(): ServerAdapter {
  return serverAdapterFor(state.target ?? DEFAULT_PACK_TARGET);
}

/** The pack build can be followed: the server has the plugin, and the plugin reports its builds in the console. */
const packBuildTracked = (): boolean => tracksPackBuild(state.target, state.config.pluginJars);

const pluginArgs = () => ({ plugin: adapter().pluginName });

/* ------------------------------------------------------------------ resource pack */

function setPack(status: PackStatus, message: string | null = null) {
  clearTimeout(packTimer);
  packTimer = undefined;
  if (status === 'building') {
    packTimer = setTimeout(() => {
      logInfo(t('testServer.packTimeout', pluginArgs()));
      setPack('idle');
    }, PACK_BUILD_TIMEOUT_MS);
  }
  setState({ pack: { status, message, at: Date.now() } });
  if (status !== 'building' && reloadPending && state.status === 'running') {
    reloadPending = false;
    setTimeout(requestReload, QUEUED_RELOAD_DELAY_MS);
  }
}

/** Reloads the plugin, or queues the reload while it is still building the resource pack. Returns whether it was sent. */
export function requestReload(): boolean {
  if (state.status !== 'running' || !serverProcess) return false;
  if (state.pack.status === 'building') {
    if (!reloadPending) logInfo(t('testServer.reloadQueued', pluginArgs()));
    reloadPending = true;
    return false;
  }
  const sent = sendCommand(adapter().reloadCommand);
  if (sent && packBuildTracked()) setPack('building', t('testServer.packReloading', pluginArgs()));
  return sent;
}

export function isReloadPending(): boolean {
  return reloadPending;
}

/* ------------------------------------------------------------------ console */

function handleLine(line: string) {
  pushLog(line);
  const event = parseServerLogLine(adapter(), line);
  switch (event?.type) {
    case 'packBuilding':
      if (state.pack.status !== 'building') setPack('building', t('testServer.packBuilding', pluginArgs()));
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
      // A plugin that builds no pack on startup serves the one of its last run (if any): build it from the current files
      if (packBuildTracked() && !adapter().buildsPackOnStart && sendCommand(adapter().reloadCommand)) {
        setPack('building', t('testServer.packBuilding', pluginArgs()));
      }
      break;
    case 'portInUse':
      failure = t('testServer.portInUse', { port: state.config.port });
      setState({ message: failure });
      break;
    case 'fatal':
      // A port message that came first explains more than the crash report it causes
      failure ??= t(event.reason === 'world' ? 'testServer.worldUnreadable' : 'testServer.crashReport');
      setState({ message: failure });
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
  const text = consoleCommandText(command);
  if (!text || !serverProcess) return false;
  pushLog(`> ${text}`, 'info');
  serverProcess.stdin.write(`${text}\n`);
  return true;
}

/** A command typed by the user; a manual plugin reload also rebuilds the pack. */
export function runUserCommand(command: string): boolean {
  const sent = sendCommand(command);
  if (sent && packBuildTracked() && adapter().isReloadCommand(command)) {
    setPack('building', t('testServer.packReloading', pluginArgs()));
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

function launch(paper: PaperInstallation, java: JavaInstallation, target: PackTargetId) {
  logInfo(t('testServer.startingPaper', { version: paper.version, java: java.version, ram: state.config.ramGb }));
  reloadPending = false;
  failure = null;
  setState({ status: 'starting', message: t('testServer.starting') });
  // The plugin builds the pack on startup; no reload until then. One that doesn't gets a reload at 'started'.
  if (packBuildTracked() && adapter().buildsPackOnStart) setPack('building', t('testServer.packBuildingOnStart', pluginArgs()));
  else setPack('idle');

  // Console output in UTF-8 (Java uses the system code page for stdout otherwise, which garbles e.g. "»" and umlauts)
  const encoding = ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8'];
  const args = ['-Xms512M', `-Xmx${state.config.ramGb}G`, ...encoding, '-jar', paper.jar, '--nogui'];
  const child = spawn(java.path, args, { cwd: serverDir(target), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  serverProcess = child;
  if (child.pid) void writePidFile(target, child.pid, paper.jar);
  readLines(child.stdout, handleLine);
  readLines(child.stderr, (line) => pushLog(line, 'err'));
  child.stdin.on('error', () => undefined);
  child.on('error', (err) => {
    const message = t('testServer.startFailed', { error: err.message });
    pushLog(message, 'err');
    processEnded(child, { status: 'error', message });
  });
  child.on('exit', (code) => {
    void removePidFile(target);
    logInfo(code !== null ? t('testServer.exitedCode', { code }) : t('testServer.exited'));
    const expected = stopRequested || (code === 0 && failure === null);
    processEnded(
      child,
      expected
        ? { status: 'stopped', message: null }
        : { status: 'error', message: failure ?? t('testServer.crashed', { code: String(code) }) },
    );
  });
}

/** Downloads what is missing, prepares the target's server folder and starts the server with the target's plugin. */
export async function start(target: PackTargetId): Promise<TestServerState> {
  await loadConfig();
  if (serverProcess || ['preparing', 'starting', 'running', 'stopping'].includes(state.status)) return publicState();
  if (!state.config.eulaAccepted) throw new DesktopError('eulaRequired');
  const { paperVersion } = state.config;
  if (!paperVersion) throw new DesktopError('versionRequired');
  stopRequested = false;
  setState({ status: 'preparing', message: t('testServer.preparing'), progress: null, target });
  const abort = new AbortController();
  const done = prepareAndLaunch(paperVersion, target, abort.signal);
  preparation = { abort, done };
  await done;
  preparation = null;
  return publicState();
}

async function prepareAndLaunch(paperVersion: string, target: PackTargetId, signal: AbortSignal): Promise<void> {
  try {
    const paper = await ensurePaper(paperVersion, signal);
    const java = await ensureJava(paper.javaMin, signal);
    state.installed = { paperVersion: paper.version, paperBuild: paper.build, javaPath: java.path, javaVersion: java.version };
    await saveConfig();
    // First: a server left running holds the plugin JAR and the world open (Windows refuses to replace them)
    await stopOrphanedServers();
    await prepareServerFiles(target);
    await setAsideIncompleteWorld(target);
    await assertPortsFree(state.config);
    signal.throwIfAborted();
    launch(paper, java, target);
  } catch (err) {
    if (signal.aborted) {
      logInfo(t('testServer.startCancelled'));
      setState({ status: 'stopped', message: null, progress: null });
      return;
    }
    const message = describeError(err);
    pushLog(message, 'err');
    setState({ status: 'error', message, progress: null });
  }
}

/**
 * Stops the server with "stop" (saves the world); kills it if it does not exit in time. A start that is still preparing
 * is cancelled.
 */
export async function stop(): Promise<void> {
  if (preparation) {
    // Cancels the downloads; the start ends as 'stopped' before anything is launched
    setState({ status: 'stopping', message: t('testServer.cancellingStart') });
    preparation.abort.abort();
    await preparation.done;
  }
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

/** Whether the server runs or a start is still preparing (downloads, Java extraction): quitting must stop it first. */
export function isActive(): boolean {
  return serverProcess !== null || preparation !== null;
}
