/** State of the test server, its console log and saved settings; every change is broadcast to the UI. */
import { DEFAULT_MINECRAFT_PORT, DEFAULT_TEST_SERVER_CONFIG, stripAnsi, TEST_SERVER_LOG_LIMIT } from '@resourcepackbuilder/test-server';
import type {
  TestServerConfigPatch,
  TestServerEvent,
  TestServerLogLine,
  TestServerSnapshot,
  TestServerState,
} from '@resourcepackbuilder/desktop-contract';
import { testServerConfigSchema } from '@resourcepackbuilder/desktop-contract/schemas';
import { BrowserWindow } from 'electron';
import fsp from 'node:fs/promises';
import { z } from 'zod';
import { readJsonFile } from '../fileHelpers';
import { t } from '../i18n';
import { send } from '../ipc';
import { configFile, rootDir, serverDir } from './paths';

type InternalState = Omit<TestServerState, 'serverDir' | 'address'>;

/** Lines sent with a full state snapshot (`testserver:get-state`). */
const SNAPSHOT_LOG_LINES = 1000;
const LOG_FLUSH_MS = 100;

/** testserver.json. Settings missing in older files are filled from the defaults before the check. */
const savedFileSchema = z.object({
  config: z.preprocess(
    (config) => ({ ...DEFAULT_TEST_SERVER_CONFIG, ...(typeof config === 'object' ? config : {}) }),
    testServerConfigSchema,
  ),
  installed: z
    .object({ paperVersion: z.string(), paperBuild: z.number(), javaPath: z.string(), javaVersion: z.number() })
    .nullable()
    .default(null),
});

export const state: InternalState = {
  status: 'stopped',
  message: null,
  progress: null,
  config: { ...DEFAULT_TEST_SERVER_CONFIG },
  installed: null,
  startedAt: null,
  lastSync: null,
  pack: { status: 'idle', message: null, at: null },
};

let log: TestServerLogLine[] = [];
let pendingLines: TestServerLogLine[] = [];
let flushTimer: NodeJS.Timeout | null = null;

export function publicState(): TestServerState {
  return {
    ...state,
    serverDir: serverDir(),
    address: state.config.port === DEFAULT_MINECRAFT_PORT ? 'localhost' : `localhost:${state.config.port}`,
  };
}

export function snapshot(): TestServerSnapshot {
  return { ...publicState(), log: log.slice(-SNAPSHOT_LOG_LINES) };
}

function broadcast(event: TestServerEvent) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) send(win.webContents, 'testserver:event', event);
  }
}

export function setState(patch: Partial<InternalState> = {}): void {
  Object.assign(state, patch);
  broadcast({ type: 'state', state: publicState() });
}

/** Adds a console line (ANSI colour codes removed); lines are sent to the UI in small batches. */
export function pushLog(line: string, kind: TestServerLogLine['kind'] = 'out'): void {
  const entry = { t: Date.now(), line: stripAnsi(line), kind };
  log.push(entry);
  if (log.length > TEST_SERVER_LOG_LIMIT) log = log.slice(-TEST_SERVER_LOG_LIMIT);
  pendingLines.push(entry);
  flushTimer ??= setTimeout(() => {
    flushTimer = null;
    const lines = pendingLines;
    pendingLines = [];
    broadcast({ type: 'log', lines });
  }, LOG_FLUSH_MS);
}

export const logInfo = (line: string): void => pushLog(line, 'info');

export function clearLog(): void {
  log = [];
}

/* ------------------------------------------------------------------ saved settings */

let configLoad: Promise<void> | null = null;

/** Loads the saved settings once; concurrent callers share the same load. */
export function loadConfig(): Promise<void> {
  configLoad ??= readConfig();
  return configLoad;
}

/**
 * Reads testserver.json. Its values end up in file names, JVM arguments and console commands, so a file that fails
 * the check is not used at all: it is kept as testserver.json.bak and the defaults apply (the EULA must be accepted
 * again).
 */
async function readConfig() {
  const saved = await readJsonFile(
    configFile(),
    (data) => savedFileSchema.safeParse(data).data ?? null,
    (backup) => logInfo(t('testServer.settingsReset', { file: backup })),
  );
  if (!saved) return;
  state.config = saved.config;
  state.installed = saved.installed;
}

export async function saveConfig(): Promise<void> {
  await fsp.mkdir(rootDir(), { recursive: true });
  await fsp.writeFile(configFile(), JSON.stringify({ config: state.config, installed: state.installed }, null, 1));
}

/** Applies a settings change from the UI (already checked and corrected by the channel's schema). */
export async function updateConfig(patch: TestServerConfigPatch): Promise<TestServerState> {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  state.config = testServerConfigSchema.parse({ ...state.config, ...defined });
  await saveConfig();
  setState();
  return publicState();
}
