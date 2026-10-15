/** State of the local test server as the UI shows it (written by the test-server sync service). */
import { create } from 'zustand';
import type { TestServerLogLine, TestServerState, TestServerSyncResult } from '../platform/desktopApi';

export interface TestServerUiState {
  /** `null` until the desktop program reported its state (or outside the desktop program) */
  server: TestServerState | null;
  log: TestServerLogLine[];
  syncing: boolean;
  /** Last transfer in which something changed */
  lastResult: (TestServerSyncResult & { at: number }) | null;
  /** Time of the last transfer (even without changes) */
  lastCheck: number | null;
  /** Why the last transfer failed; translated by the UI */
  syncError: unknown;
}

export const useTestServerStore = create<TestServerUiState>(() => ({
  server: null,
  log: [],
  syncing: false,
  lastResult: null,
  lastCheck: null,
  syncError: null,
}));
