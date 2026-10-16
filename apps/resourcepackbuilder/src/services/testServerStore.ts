/** State of the local test server as the UI shows it (written by the test-server sync service). */
import { create } from 'zustand';
import type { TestServerLogLine, TestServerState, TestServerSyncResult } from '../platform/desktopApi';

export interface TestServerUiState {
  /** `null` until the desktop program reported its state (or outside the desktop program) */
  server: TestServerState | null;
  log: TestServerLogLine[];
  isSyncing: boolean;
  /** Last transfer in which something changed */
  lastResult: (TestServerSyncResult & { at: number }) | null;
  /** Time of the last transfer (even without changes) */
  lastCheck: number | null;
  /** Why the last transfer failed; worded by `useErrorMessage` */
  syncError: Error | null;
  /** Paper versions the server can run, newest first; `null` until loaded */
  paperVersions: string[] | null;
  /** Why loading the Paper versions failed; worded by `useErrorMessage` */
  paperVersionsError: Error | null;
}

export const useTestServerStore = create<TestServerUiState>(() => ({
  server: null,
  log: [],
  isSyncing: false,
  lastResult: null,
  lastCheck: null,
  syncError: null,
  paperVersions: null,
  paperVersionsError: null,
}));
