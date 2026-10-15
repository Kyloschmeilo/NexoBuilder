// @ts-check
/**
 * The server process: start, stop, console commands, and Nexo's resource pack state read from the console.
 *
 * Nexo builds the pack in the background. A "nexo reload" in the meantime starts a second build in parallel and both
 * fail (e.g. "items.json already exists"), so reloads wait until the current build is done.
 */
const { spawn } = require('node:child_process');
const { t } = require('../i18n.cjs');
const { ensureJava } = require('./java.cjs');
const { ensurePaper } = require('./paper.cjs');
const { serverDir } = require('./paths.cjs');
const { prepareServerFiles } = require('./serverFiles.cjs');
const { logInfo, loadConfig, publicState, pushLog, saveConfig, setState, state } = require('./state.cjs');

/** @typedef {import('../../src/platform/desktopApi').PackStatus} PackStatus */
/** @typedef {import('../../src/platform/desktopApi').TestServerState} TestServerState */

const STOP_TIMEOUT_MS = 45_000;
const PACK_BUILD_TIMEOUT_MS = 3 * 60_000;
/** Pause between a finished pack build and a queued reload, so Nexo has settled. */
const QUEUED_RELOAD_DELAY_MS = 1000;
const RELOAD_COMMAND = /^\/?(nexo|n)\s+(reload|rl)\b/i;

/** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */
let serverProcess = null;
let stopRequested = false;
let reloadPending = false;
/** @type {NodeJS.Timeout | undefined} */
let packTimer;

/* ------------------------------------------------------------------ resource pack */

/**
 * @param {PackStatus} status
 * @param {string | null} [message]
 */
function setPack(status, message = null) {
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
function requestReload() {
  if (state.status !== 'running' || !serverProcess) return false;
  if (state.pack.status === 'building') {
    if (!reloadPending) logInfo(t('testServer.reloadQueued'));
    reloadPending = true;
    return false;
  }
  const sent = sendCommand('nexo reload all');
  if (sent && state.config.nexoJar) setPack('building', t('testServer.packReloading'));
  return sent;
}

function isReloadPending() {
  return reloadPending;
}

/** @param {string} line */
function watchNexoPack(line) {
  if (!/Nexo/.test(line)) return;
  if (/Generating resourcepack/i.test(line)) {
    if (state.pack.status !== 'building') setPack('building', t('testServer.packBuilding'));
    return;
  }
  const uploaded = /Resourcepack uploaded and will be dispatched with publicAddress\s*(\S*)|ResourcePack uploaded:\s*(\S*)/i.exec(line);
  if (uploaded) {
    setPack('ready', uploaded[1] || uploaded[2] || null);
    return;
  }
  const failed = /Failed to build and send the finished ResourcePack:\s*(.*)|Upload failed:\s*(.*)|could not be uploaded(.*)/i.exec(line);
  if (failed) setPack('failed', (failed[1] || failed[2] || failed[3] || '').trim() || t('testServer.unknownError'));
}

/* ------------------------------------------------------------------ console */

/** @param {string} line */
function handleLine(line) {
  pushLog(line);
  watchNexoPack(line);
  if (state.status === 'starting' && /Done \([\d.,]+s\)! For help/.test(line)) {
    setState({ status: 'running', message: null, startedAt: Date.now() });
    if (state.config.playerName) sendCommand(`op ${state.config.playerName}`);
  }
  if (/FAILED TO BIND TO PORT/i.test(line)) {
    setState({ message: t('testServer.portInUse', { port: state.config.port }) });
  }
}

/**
 * @param {import('node:stream').Readable} stream
 * @param {(line: string) => void} onLine
 */
function readLines(stream, onLine) {
  let rest = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    const parts = (rest + chunk).split(/\r?\n/);
    rest = parts.pop() ?? '';
    for (const part of parts) if (part.trim()) onLine(part);
  });
  stream.on('end', () => {
    if (rest.trim()) onLine(rest);
  });
}

/**
 * Sends a console command (without a leading slash). Returns false if the server is not running.
 * @param {unknown} command
 */
function sendCommand(command) {
  const text = String(command ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  if (!text || !serverProcess) return false;
  pushLog(`> ${text}`, 'info');
  serverProcess.stdin.write(`${text}\n`);
  return true;
}

/**
 * A command typed by the user; a manual Nexo reload also rebuilds the pack.
 * @param {unknown} command
 */
function runUserCommand(command) {
  const sent = sendCommand(command);
  if (sent && state.config.nexoJar && RELOAD_COMMAND.test(String(command).trim())) {
    setPack('building', t('testServer.packReloading'));
  }
  return sent;
}

/* ------------------------------------------------------------------ start / stop */

/**
 * Ends the bookkeeping for `child` once (it may report both 'error' and 'exit').
 * @param {import('node:child_process').ChildProcess} child
 * @param {Partial<TestServerState>} patch
 */
function processEnded(child, patch) {
  if (serverProcess !== child) return;
  serverProcess = null;
  stopRequested = false;
  reloadPending = false;
  setPack('idle');
  setState({ startedAt: null, progress: null, ...patch });
}

/** @param {{ jar: string, version: string, build: number }} paper @param {{ path: string, version: number }} java */
function launch(paper, java) {
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
async function start() {
  await loadConfig();
  if (serverProcess || ['preparing', 'starting', 'running', 'stopping'].includes(state.status)) return publicState();
  if (!state.config.eulaAccepted) throw new Error(t('testServer.eulaRequired'));
  const { paperVersion } = state.config;
  if (!paperVersion) throw new Error(t('testServer.versionRequired'));
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
    const message = err instanceof Error ? err.message : String(err);
    pushLog(message, 'err');
    setState({ status: 'error', message, progress: null });
  }
  return publicState();
}

/** Stops the server with "stop" (saves the world); kills it if it does not exit in time. */
async function stop() {
  const child = serverProcess;
  if (!child) {
    if (state.status !== 'stopped') setState({ status: 'stopped', message: null });
    return;
  }
  stopRequested = true;
  setState({ status: 'stopping', message: t('testServer.stopping') });
  sendCommand('stop');
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      pushLog(t('testServer.notResponding'), 'err');
      child.kill('SIGKILL');
      resolve(undefined);
    }, STOP_TIMEOUT_MS);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(undefined);
    });
  });
}

function isRunning() {
  return serverProcess !== null;
}

module.exports = { start, stop, isRunning, requestReload, isReloadPending, runUserCommand };
