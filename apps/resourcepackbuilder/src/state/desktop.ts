/**
 * Functions provided only by the Windows app (Electron, electron/preload.cjs).
 * They do not exist in the browser – there, e.g. sharing via a folder is not available.
 */
import type { SyncFileInfo } from '@resourcepackbuilder/core/sync/engine';

export interface ShareFolderInfo {
  exists: boolean;
  empty: boolean;
  /** Shared project directly in this folder */
  project: { id: string; name: string } | null;
  /** Shared projects in subfolders */
  children: Array<{ path: string; name: string; projectName: string; projectId: string }>;
}

export interface DesktopShareApi {
  chooseFolder(purpose: 'share' | 'join'): Promise<string | null>;
  inspect(folder: string): Promise<ShareFolderInfo>;
  createSubfolder(parent: string, name: string): Promise<string>;
  list(folder: string): Promise<SyncFileInfo[]>;
  read(folder: string, path: string): Promise<string | null>;
  write(folder: string, path: string, content: string): Promise<SyncFileInfo>;
  watch(folder: string): Promise<boolean>;
  unwatch(folder: string): Promise<void>;
  openFolder(folder: string): Promise<void>;
  userName(): Promise<string>;
  onChange(callback: (folder: string) => void): () => void;
}

export type TestServerStatus = 'stopped' | 'preparing' | 'starting' | 'running' | 'stopping' | 'error';

export interface TestServerConfig {
  paperVersion: string | null;
  ramGb: number;
  port: number;
  packPort: number;
  playerName: string;
  eulaAccepted: boolean;
  autoUpdate: boolean;
  nexoJar: { file: string; name: string; version: string } | null;
}

export interface TestServerState {
  status: TestServerStatus;
  message: string | null;
  progress: number | null;
  config: TestServerConfig;
  installed: { paperVersion: string; paperBuild: number; javaPath: string; javaVersion: number } | null;
  startedAt: number | null;
  lastSync: number | null;
  /** State of the Nexo resource pack (read from the server output) */
  pack: { status: 'idle' | 'building' | 'ready' | 'failed'; message: string | null; at: number | null };
  serverDir: string;
  /** Address for Minecraft (direct connection) */
  address: string;
}

export interface TestServerLogLine {
  t: number;
  line: string;
  kind: 'out' | 'err' | 'info';
}

export type TestServerEvent = { type: 'state'; state: TestServerState } | { type: 'log'; lines: TestServerLogLine[] };

export interface TestServerSyncResult {
  written: number;
  deleted: number;
  skipped: number;
  settingsChanged: boolean;
  reloaded: boolean;
  total: number;
}

export interface DesktopTestServerApi {
  getState(): Promise<TestServerState & { log: TestServerLogLine[] }>;
  setConfig(patch: Partial<TestServerConfig>): Promise<TestServerState>;
  versions(): Promise<string[]>;
  chooseNexoJar(): Promise<TestServerConfig['nexoJar']>;
  start(): Promise<TestServerState>;
  stop(): Promise<TestServerState>;
  command(command: string): Promise<boolean>;
  /** "nexo reload all" – waits automatically while Nexo is still building the pack */
  reload(): Promise<boolean>;
  sync(
    files: Array<{ path: string; data: string | Uint8Array }>,
    options: { reload: boolean; settings?: string },
  ): Promise<TestServerSyncResult>;
  readSettings(): Promise<string | null>;
  openFolder(): Promise<void>;
  clearLog(): Promise<boolean>;
  onEvent(callback: (event: TestServerEvent) => void): () => void;
}

declare global {
  interface Window {
    nexoDesktop?: { share?: DesktopShareApi; testServer?: DesktopTestServerApi };
  }
}

export function desktopShare(): DesktopShareApi | null {
  return (typeof window !== 'undefined' && window.nexoDesktop?.share) || null;
}

export function desktopTestServer(): DesktopTestServerApi | null {
  return (typeof window !== 'undefined' && window.nexoDesktop?.testServer) || null;
}
