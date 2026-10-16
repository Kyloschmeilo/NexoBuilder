/**
 * The IPC contract between the UI (renderer) and the Electron main process, defined once: {@link DESKTOP_API} lists
 * every method of `window.resourcepackBuilder` with its channel, argument and result types. The preload script builds
 * the bridge from it, the main process registers a handler (and an argument schema, `./schemas`) per channel, and the
 * UI gets {@link DesktopApi} – so a new channel is one entry here plus its handler.
 *
 * No runtime dependencies: the preload script and the renderer import this file too.
 */
import type { ShareFileInfo } from '@resourcepackbuilder/core/sync/engine';
import type { NexoJarInfo, TestServerConfig } from '@resourcepackbuilder/core/testServer/config';
import type { ServerFile } from '@resourcepackbuilder/core/testServer/files';
import type { SupportedLocale } from '@resourcepackbuilder/i18n/locale';

export type { NexoJarInfo, ShareFileInfo, TestServerConfig };

/* ------------------------------------------------------------------ shared folders */

export type ShareFolderPurpose = 'share' | 'join';

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

/** A project file for plugins/Nexo (path relative to it, with forward slashes). */
export type TestServerSyncFile = ServerFile;

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

/* ------------------------------------------------------------------ channel definitions */

/** A request/response channel (`ipcRenderer.invoke`); the types live only in the type parameters. */
export interface InvokeDef<C extends string = string, A extends unknown[] = never, R = unknown> {
  readonly kind: 'invoke';
  readonly channel: C;
  /** Type carrier, never set. */
  readonly __signature?: (...args: A) => R;
}

/** An event channel the main process sends to the renderer. */
export interface EventDef<C extends string = string, P = unknown> {
  readonly kind: 'event';
  readonly channel: C;
  /** Type carrier, never set. */
  readonly __payload?: P;
}

const invoke =
  <A extends unknown[], R>() =>
  <C extends string>(channel: C): InvokeDef<C, A, R> => ({ kind: 'invoke', channel });

const event =
  <P>() =>
  <C extends string>(channel: C): EventDef<C, P> => ({ kind: 'event', channel });

/** Every method of `window.resourcepackBuilder`, grouped as on the object, with its channel. */
export const DESKTOP_API = {
  app: {
    /** Tells the main process the UI language (menus, native dialogs, test-server messages). */
    setLocale: invoke<[locale: SupportedLocale], void>()('app:set-locale'),
  },
  share: {
    chooseFolder: invoke<[purpose: ShareFolderPurpose], string | null>()('share:choose-folder'),
    inspect: invoke<[folder: string], ShareFolderInfo>()('share:inspect'),
    createSubfolder: invoke<[parent: string, name: string], string>()('share:create-subfolder'),
    list: invoke<[folder: string], ShareFileInfo[]>()('share:list'),
    read: invoke<[folder: string, path: string], string | null>()('share:read'),
    write: invoke<[folder: string, path: string, content: string], ShareFileInfo>()('share:write'),
    watch: invoke<[folder: string], boolean>()('share:watch'),
    unwatch: invoke<[folder: string], void>()('share:unwatch'),
    /** The project in `folder` is no longer shared: the folder is no longer accessible without choosing it again. */
    forget: invoke<[folder: string], void>()('share:forget'),
    openFolder: invoke<[folder: string], void>()('share:open-folder'),
    userName: invoke<[], string>()('share:user-name'),
    /** A watched shared folder changed on disk (payload: the folder). */
    onChange: event<string>()('share:changed'),
  },
  testServer: {
    getState: invoke<[], TestServerSnapshot>()('testserver:get-state'),
    setConfig: invoke<[patch: TestServerConfigPatch], TestServerState>()('testserver:set-config'),
    versions: invoke<[], string[]>()('testserver:versions'),
    chooseNexoJar: invoke<[], NexoJarInfo | null>()('testserver:choose-nexo-jar'),
    start: invoke<[], TestServerState>()('testserver:start'),
    stop: invoke<[], TestServerState>()('testserver:stop'),
    command: invoke<[command: string], boolean>()('testserver:command'),
    /** "nexo reload all" – waits automatically while Nexo is still building the pack. */
    reload: invoke<[], boolean>()('testserver:reload'),
    sync: invoke<[files: TestServerSyncFile[], options: TestServerSyncOptions], TestServerSyncResult>()('testserver:sync'),
    readSettings: invoke<[], string | null>()('testserver:read-settings'),
    openFolder: invoke<[], void>()('testserver:open-folder'),
    clearLog: invoke<[], boolean>()('testserver:clear-log'),
    onEvent: event<TestServerEvent>()('testserver:event'),
  },
} as const;

type ApiDefs = typeof DESKTOP_API;
type AnyDef = { [N in keyof ApiDefs]: ApiDefs[N][keyof ApiDefs[N]] }[keyof ApiDefs];
type InvokeDefs = Extract<AnyDef, { kind: 'invoke' }>;
type EventDefs = Extract<AnyDef, { kind: 'event' }>;

/** The method a definition becomes on `window.resourcepackBuilder`. */
type BridgeMethod<D> =
  D extends InvokeDef<string, infer A, infer R>
    ? (...args: A) => Promise<R>
    : D extends EventDef<string, infer P>
      ? (callback: (payload: P) => void) => () => void
      : never;

/** The object the preload script exposes as `window.resourcepackBuilder` (desktop app only). */
export type DesktopApi = { [N in keyof ApiDefs]: { [M in keyof ApiDefs[N]]: BridgeMethod<ApiDefs[N][M]> } };
export type DesktopAppApi = DesktopApi['app'];
export type DesktopShareApi = DesktopApi['share'];
export type DesktopTestServerApi = DesktopApi['testServer'];

/** Every invoke channel. */
export type DesktopInvokeChannel = InvokeDefs['channel'];
/** The arguments of an invoke channel. */
export type DesktopInvokeArgs<C extends DesktopInvokeChannel> =
  Extract<InvokeDefs, { channel: C }> extends InvokeDef<C, infer A, unknown> ? A : never;
/** The result of an invoke channel. */
export type DesktopInvokeResult<C extends DesktopInvokeChannel> =
  Extract<InvokeDefs, { channel: C }> extends InvokeDef<C, infer _A, infer R> ? R : never;

/** Every event channel. */
export type DesktopEventChannel = EventDefs['channel'];
/** The payload of an event channel. */
export type DesktopEventPayload<C extends DesktopEventChannel> =
  Extract<EventDefs, { channel: C }> extends EventDef<C, infer P> ? P : never;
