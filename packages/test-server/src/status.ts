/** States of the test server and its resource pack, and what the UI derives from them. */

export type TestServerStatus = 'stopped' | 'preparing' | 'starting' | 'running' | 'stopping' | 'error';

export type PackStatus = 'idle' | 'building' | 'ready' | 'failed';

/** The server is on its way between stopped and running. */
export function isTransitioning(status: TestServerStatus): boolean {
  return status === 'preparing' || status === 'starting' || status === 'stopping';
}

/** Settings that only apply on start cannot be changed while the server is up (or on its way). */
export function isConfigLocked(status: TestServerStatus): boolean {
  return status !== 'stopped' && status !== 'error';
}

/** What a finished transfer of the project to the server reports. */
export interface SyncOutcome {
  /** When it finished (ms since epoch) */
  at: number;
  written: number;
  deleted: number;
  skipped: number;
  reloaded: boolean;
}

export interface SyncHistory {
  /** The last transfer that changed something */
  lastResult: SyncOutcome | null;
  /** The last check (ms since epoch), also one that found nothing to do */
  lastCheck: number | null;
  /** The error of the last transfer, `null` when it succeeded */
  syncError: unknown;
}

/** One sentence of the transfer summary; the UI words it with `media.testServer.sync.<key>`. */
export type SyncSummaryPart =
  | { key: 'last'; at: number; written: number; deleted: number; reloaded: boolean }
  | { key: 'onStart' }
  | { key: 'upToDate'; at: number }
  | { key: 'skipped'; count: number };

/**
 * What the transfer card says about the last transfers: the last one that changed something (or that the project is
 * transferred on start), whether a later check found everything up to date, and skipped files. After a failure only
 * the skipped files are mentioned – the error itself is shown separately.
 */
export function syncSummary({ lastResult, lastCheck, syncError }: SyncHistory, isRunning: boolean): SyncSummaryPart[] {
  const parts: SyncSummaryPart[] = [];
  if (syncError === null) {
    if (lastResult) {
      const { at, written, deleted, reloaded } = lastResult;
      parts.push({ key: 'last', at, written, deleted, reloaded });
    } else if (!isRunning) {
      parts.push({ key: 'onStart' });
    }
    if (lastCheck !== null && (!lastResult || lastCheck > lastResult.at)) parts.push({ key: 'upToDate', at: lastCheck });
  }
  if (lastResult?.skipped) parts.push({ key: 'skipped', count: lastResult.skipped });
  return parts;
}
