// @ts-check
/** State of the test server, its console log and saved settings; every change is broadcast to the UI. */
const { BrowserWindow } = require('electron');
const fsp = require('node:fs/promises');
const { send } = require('../ipc.cjs');
const { configFile, rootDir, serverDir } = require('./paths.cjs');

/** @typedef {import('../../src/platform/desktopApi').TestServerConfig} TestServerConfig */
/** @typedef {import('../../src/platform/desktopApi').TestServerConfigPatch} TestServerConfigPatch */
/** @typedef {import('../../src/platform/desktopApi').TestServerEvent} TestServerEvent */
/** @typedef {import('../../src/platform/desktopApi').TestServerLogLine} TestServerLogLine */
/** @typedef {import('../../src/platform/desktopApi').TestServerState} TestServerState */
/** @typedef {Omit<TestServerState, 'serverDir' | 'address'>} InternalState */

const LOG_LIMIT = 3000;
/** Lines sent with a full state snapshot (`testserver:get-state`). */
const SNAPSHOT_LOG_LINES = 1000;
const LOG_FLUSH_MS = 100;
const DEFAULT_MINECRAFT_PORT = 25565;

/** @type {TestServerConfig} */
const DEFAULT_CONFIG = {
  paperVersion: null,
  ramGb: 2,
  port: DEFAULT_MINECRAFT_PORT,
  packPort: 8082,
  playerName: '',
  eulaAccepted: false,
  autoUpdate: true,
  nexoJar: null,
};

/** @type {InternalState} */
const state = {
  status: 'stopped',
  message: null,
  progress: null,
  config: { ...DEFAULT_CONFIG },
  installed: null,
  startedAt: null,
  lastSync: null,
  pack: { status: 'idle', message: null, at: null },
};

/** @type {TestServerLogLine[]} */
let log = [];
/** @type {TestServerLogLine[]} */
let pendingLines = [];
/** @type {NodeJS.Timeout | null} */
let flushTimer = null;

/** @returns {TestServerState} */
function publicState() {
  return {
    ...state,
    serverDir: serverDir(),
    address: state.config.port === DEFAULT_MINECRAFT_PORT ? 'localhost' : `localhost:${state.config.port}`,
  };
}

function snapshot() {
  return { ...publicState(), log: log.slice(-SNAPSHOT_LOG_LINES) };
}

/** @param {TestServerEvent} event */
function broadcast(event) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) send(win.webContents, 'testserver:event', event);
  }
}

/** @param {Partial<InternalState>} [patch] */
function setState(patch = {}) {
  Object.assign(state, patch);
  broadcast({ type: 'state', state: publicState() });
}

/**
 * Adds a console line (ANSI colour codes removed); lines are sent to the UI in small batches.
 * @param {string} line
 * @param {TestServerLogLine['kind']} [kind]
 */
function pushLog(line, kind = 'out') {
  // eslint-disable-next-line no-control-regex -- strips ANSI escape sequences
  const entry = { t: Date.now(), line: line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, ''), kind };
  log.push(entry);
  if (log.length > LOG_LIMIT) log = log.slice(-LOG_LIMIT);
  pendingLines.push(entry);
  flushTimer ??= setTimeout(() => {
    flushTimer = null;
    const lines = pendingLines;
    pendingLines = [];
    broadcast({ type: 'log', lines });
  }, LOG_FLUSH_MS);
}

/** @param {string} line */
const logInfo = (line) => pushLog(line, 'info');

function clearLog() {
  log = [];
}

/* ------------------------------------------------------------------ saved settings */

/** @type {Promise<void> | null} */
let configLoad = null;

/** Loads the saved settings once; concurrent callers share the same load. */
function loadConfig() {
  configLoad ??= readConfig();
  return configLoad;
}

async function readConfig() {
  try {
    const saved = JSON.parse(await fsp.readFile(configFile(), 'utf8'));
    state.config = { ...DEFAULT_CONFIG, ...saved.config };
    state.installed = saved.installed ?? null;
  } catch {
    // first launch or unreadable file: keep the defaults
  }
}

async function saveConfig() {
  await fsp.mkdir(rootDir(), { recursive: true });
  await fsp.writeFile(configFile(), JSON.stringify({ config: state.config, installed: state.installed }, null, 1));
}

/**
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 */
function clampInt(value, min, max, fallback) {
  return Math.min(max, Math.max(min, Math.round(Number(value) || fallback)));
}

/**
 * Keeps only valid settings from a patch sent by the UI.
 * @param {unknown} patch
 * @returns {TestServerConfigPatch}
 */
function cleanConfigPatch(patch) {
  /** @type {TestServerConfigPatch} */
  const next = {};
  if (patch == null || typeof patch !== 'object') return next;
  /** @type {Record<string, unknown>} */
  const source = { ...patch };
  if ('paperVersion' in source) {
    next.paperVersion = typeof source.paperVersion === 'string' && /^[0-9A-Za-z._-]{1,32}$/.test(source.paperVersion) ? source.paperVersion : null;
  }
  if ('ramGb' in source) next.ramGb = clampInt(source.ramGb, 1, 16, DEFAULT_CONFIG.ramGb);
  if ('port' in source) next.port = clampInt(source.port, 1024, 65535, DEFAULT_CONFIG.port);
  if ('packPort' in source) next.packPort = clampInt(source.packPort, 1024, 65535, DEFAULT_CONFIG.packPort);
  if ('playerName' in source) {
    next.playerName = String(source.playerName ?? '')
      .replace(/[^A-Za-z0-9_]/g, '')
      .slice(0, 16);
  }
  if ('eulaAccepted' in source) next.eulaAccepted = source.eulaAccepted === true;
  if ('autoUpdate' in source) next.autoUpdate = source.autoUpdate !== false;
  return next;
}

/** @param {unknown} patch */
async function updateConfig(patch) {
  state.config = { ...state.config, ...cleanConfigPatch(patch) };
  await saveConfig();
  setState();
  return publicState();
}

module.exports = { state, publicState, snapshot, setState, pushLog, logInfo, clearLog, loadConfig, saveConfig, updateConfig };
