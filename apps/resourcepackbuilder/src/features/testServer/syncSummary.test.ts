import { describe, expect, it } from 'vitest';
import type { TestServerSyncResult } from '../../platform/desktopApi';
import { syncSummary } from './syncSummary';

const result = (patch: Partial<TestServerSyncResult> = {}) => ({
  written: 3,
  deleted: 1,
  skipped: 0,
  settingsChanged: false,
  reloaded: true,
  total: 10,
  at: 1000,
  ...patch,
});

describe('syncSummary', () => {
  it('announces the transfer on start before the first one', () => {
    expect(syncSummary({ lastResult: null, lastCheck: null, syncError: null }, false)).toEqual([{ key: 'onStart' }]);
    expect(syncSummary({ lastResult: null, lastCheck: null, syncError: null }, true)).toEqual([]);
  });

  it('reports the last change and a later check that found nothing to do', () => {
    expect(syncSummary({ lastResult: result(), lastCheck: 2000, syncError: null }, true)).toEqual([
      { key: 'last', at: 1000, written: 3, deleted: 1, reloaded: true },
      { key: 'upToDate', at: 2000 },
    ]);
  });

  it('leaves out the check that belongs to the last change', () => {
    expect(syncSummary({ lastResult: result(), lastCheck: 1000, syncError: null }, true)).toEqual([
      { key: 'last', at: 1000, written: 3, deleted: 1, reloaded: true },
    ]);
  });

  it('only mentions skipped files after a failure', () => {
    expect(syncSummary({ lastResult: result({ skipped: 2 }), lastCheck: 2000, syncError: new Error('x') }, true)).toEqual([
      { key: 'skipped', count: 2 },
    ]);
  });
});
