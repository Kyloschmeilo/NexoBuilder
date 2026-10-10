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

declare global {
  interface Window {
    nexoDesktop?: { share?: DesktopShareApi };
  }
}

export function desktopShare(): DesktopShareApi | null {
  return (typeof window !== 'undefined' && window.nexoDesktop?.share) || null;
}
