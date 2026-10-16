import type { TestServerUiState } from '../../services/testServerStore';

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
export function syncSummary(
  { lastResult, lastCheck, syncError }: Pick<TestServerUiState, 'lastResult' | 'lastCheck' | 'syncError'>,
  isRunning: boolean,
): SyncSummaryPart[] {
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
