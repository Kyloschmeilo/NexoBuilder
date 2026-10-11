/**
 * Funktionen, die nur das Windows-Programm (Electron, electron/preload.cjs) bereitstellt.
 * Im Browser gibt es sie nicht – dann ist z.B. das Teilen über einen Ordner nicht verfügbar.
 */
import type { SyncFileInfo } from '../core/sync/engine';

export interface ShareFolderInfo {
  exists: boolean;
  empty: boolean;
  /** Geteiltes Projekt direkt in diesem Ordner */
  project: { id: string; name: string } | null;
  /** Geteilte Projekte in Unterordnern */
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
  serverDir: string;
  /** Adresse für Minecraft (Direktverbindung) */
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
