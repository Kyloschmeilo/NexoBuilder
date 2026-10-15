/** State of the automatic saving (shown in the top bar). */
import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const useSaveStore = create<{ status: SaveStatus }>(() => ({ status: 'idle' }));
