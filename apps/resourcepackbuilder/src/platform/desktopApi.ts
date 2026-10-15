/**
 * The IPC contract between the renderer and the Electron main process – types only.
 *
 * Used by the renderer (`platform/desktop.ts`) and type-checked against the Electron sources
 * (`electron/*.cjs`, via JSDoc `import()` types and `tsconfig.electron.json`). Keep this file free of imports so
 * both sides can compile it on their own.
 */

/* ------------------------------------------------------------------ shared folders */

export type ShareFolderPurpose = 'share' | 'join';

/** A file inside a shared folder, as listed or written by the main process. */
export interface ShareFileInfo {
  /** Path relative to the shared folder, with forward slashes. */
  path: string;
  mtimeMs: number;
  size: number;
}

export interface ShareFolderInfo {
  exists: boolean;
  empty: boolean;
  /** Shared project directly in this folder. */
  project: { id: string; name: string } | null;
  /** Shared projects in subfolders. */
  children: Array<{ path: string; name: string; projectName: string; projectId: string }>;
}

/* ------------------------------------------------------------------ test server */

export type TestServerStatus = 'stopped' | 'preparing' | 'starting' | 'running' | 'stopping' | 'error';

export interface NexoJarInfo {
  file: string;
  name: string;
  version: string;
}

export interface TestServerConfig {
  paperVersion: string | null;
  ramGb: number;
  port: number;
  packPort: number;
  playerName: string;
  eulaAccepted: boolean;
  autoUpdate: boolean;
  nexoJar: NexoJarInfo | null;
}

/** The settings the UI may change directly (the Nexo JAR is chosen through `chooseNexoJar`). */
export type TestServerConfigPatch = Partial<Omit<TestServerConfig, 'nexoJar'>>;

export interface TestServerInstallation {
  paperVersion: string;
  paperBuild: number;
  javaPath: string;
  javaVersion: number;
}

export type PackStatus = 'idle' | 'building' | 'ready' | 'failed';

export interface TestServerState {
  status: TestServerStatus;
  /** Already translated by the main process (in the language last passed to `setLocale`). */
  message: string | null;
  progress: number | null;
  config: TestServerConfig;
  installed: TestServerInstallation | null;
  startedAt: number | null;
  lastSync: number | null;
  /**
   * State of the Nexo resource pack (read from the server output). `message` is translated by the main process
   * while building; for `ready` it is the pack URL, for `failed` Nexo's own error text.
   */
  pack: { status: PackStatus; message: string | null; at: number | null };
  serverDir: string;
  /** Address for Minecraft (direct connection). */
  address: string;
}

export interface TestServerLogLine {
  t: number;
  line: string;
  kind: 'out' | 'err' | 'info';
}

export type TestServerSnapshot = TestServerState & { log: TestServerLogLine[] };

export type TestServerEvent = { type: 'state'; state: TestServerState } | { type: 'log'; lines: TestServerLogLine[] };

export interface TestServerSyncFile {
  /** Path relative to `plugins/Nexo`, with forward slashes. */
  path: string;
  data: string | Uint8Array;
}

export interface TestServerSyncOptions {
  reload: boolean;
  /** Full content of `plugins/Nexo/settings.yml`; left untouched when omitted. */
  settings?: string;
}

export interface TestServerSyncResult {
  written: number;
  deleted: number;
  skipped: number;
  settingsChanged: boolean;
  reloaded: boolean;
  total: number;
}

/* ------------------------------------------------------------------ channels */

/** Every `ipcRenderer.invoke` channel with its arguments and result. */
export interface DesktopInvokeChannels {
  'app:set-locale': { args: [locale: string]; result: void };

  'share:choose-folder': { args: [purpose: ShareFolderPurpose]; result: string | null };
  'share:inspect': { args: [folder: string]; result: ShareFolderInfo };
  'share:create-subfolder': { args: [parent: string, name: string]; result: string };
  'share:list': { args: [folder: string]; result: ShareFileInfo[] };
  'share:read': { args: [folder: string, path: string]; result: string | null };
  'share:write': { args: [folder: string, path: string, content: string]; result: ShareFileInfo };
  'share:watch': { args: [folder: string]; result: boolean };
  'share:unwatch': { args: [folder: string]; result: void };
  'share:open-folder': { args: [folder: string]; result: void };
  'share:user-name': { args: []; result: string };

  'testserver:get-state': { args: []; result: TestServerSnapshot };
  'testserver:set-config': { args: [patch: TestServerConfigPatch]; result: TestServerState };
  'testserver:versions': { args: []; result: string[] };
  'testserver:choose-nexo-jar': { args: []; result: NexoJarInfo | null };
  'testserver:start': { args: []; result: TestServerState };
  'testserver:stop': { args: []; result: TestServerState };
  'testserver:command': { args: [command: string]; result: boolean };
  'testserver:reload': { args: []; result: boolean };
  'testserver:sync': { args: [files: TestServerSyncFile[], options: TestServerSyncOptions]; result: TestServerSyncResult };
  'testserver:read-settings': { args: []; result: string | null };
  'testserver:open-folder': { args: []; result: void };
  'testserver:clear-log': { args: []; result: boolean };
}

export type DesktopInvokeChannel = keyof DesktopInvokeChannels;
export type DesktopInvokeArgs<C extends DesktopInvokeChannel> = DesktopInvokeChannels[C]['args'];
export type DesktopInvokeResult<C extends DesktopInvokeChannel> = DesktopInvokeChannels[C]['result'];

/** Every channel the main process sends to the renderer, with its payload. */
export interface DesktopEventChannels {
  /** A watched shared folder changed on disk (payload: the folder). */
  'share:changed': string;
  'testserver:event': TestServerEvent;
}

/* ------------------------------------------------------------------ bridge (window.resourcepackBuilder) */

export interface DesktopAppApi {
  /** Tells the main process the UI language (menus, native dialogs, test-server messages). */
  setLocale(locale: string): Promise<void>;
}

export interface DesktopShareApi {
  chooseFolder(purpose: ShareFolderPurpose): Promise<string | null>;
  inspect(folder: string): Promise<ShareFolderInfo>;
  createSubfolder(parent: string, name: string): Promise<string>;
  list(folder: string): Promise<ShareFileInfo[]>;
  read(folder: string, path: string): Promise<string | null>;
  write(folder: string, path: string, content: string): Promise<ShareFileInfo>;
  watch(folder: string): Promise<boolean>;
  unwatch(folder: string): Promise<void>;
  openFolder(folder: string): Promise<void>;
  userName(): Promise<string>;
  onChange(callback: (folder: string) => void): () => void;
}

export interface DesktopTestServerApi {
  getState(): Promise<TestServerSnapshot>;
  setConfig(patch: TestServerConfigPatch): Promise<TestServerState>;
  versions(): Promise<string[]>;
  chooseNexoJar(): Promise<NexoJarInfo | null>;
  start(): Promise<TestServerState>;
  stop(): Promise<TestServerState>;
  command(command: string): Promise<boolean>;
  /** "nexo reload all" – waits automatically while Nexo is still building the pack. */
  reload(): Promise<boolean>;
  sync(files: TestServerSyncFile[], options: TestServerSyncOptions): Promise<TestServerSyncResult>;
  readSettings(): Promise<string | null>;
  openFolder(): Promise<void>;
  clearLog(): Promise<boolean>;
  onEvent(callback: (event: TestServerEvent) => void): () => void;
}

/** The object the preload script exposes as `window.resourcepackBuilder` (desktop app only). */
export interface DesktopApi {
  app: DesktopAppApi;
  share: DesktopShareApi;
  testServer: DesktopTestServerApi;
}

declare global {
  interface Window {
    /** Present only inside the desktop app. */
    resourcepackBuilder?: DesktopApi;
  }
}
