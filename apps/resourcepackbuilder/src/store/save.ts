/** State of the automatic saving (shown in the top bar; a new series of failures is announced once). */
import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveState {
  status: SaveStatus;
  /** Set by a failed save, cleared by the next successful one */
  isFailing: boolean;
}

export const useSaveStore = create<SaveState>(() => ({ status: 'idle', isFailing: false }));
