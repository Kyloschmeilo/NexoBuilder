/** State of the shared-folder connection of the open project (written by the share sync service). */
import { create } from 'zustand';

export type ShareStatus = 'off' | 'connecting' | 'synced' | 'syncing' | 'offline' | 'error';

export interface ShareState {
  projectId: string | null;
  folder: string | null;
  userName: string;
  status: ShareStatus;
  /** Why syncing stopped (status `error`); translated by the UI */
  error: unknown;
  lastSync: number | null;
}

export const DISCONNECTED: ShareState = { projectId: null, folder: null, userName: '', status: 'off', error: null, lastSync: null };

export const useShareStore = create<ShareState>(() => DISCONNECTED);

/** Whether the project `projectId` is the one shared right now. */
export function isProjectShared(share: ShareState, projectId: string | undefined): boolean {
  return share.projectId === projectId && share.status !== 'off';
}
