import type { StatusPillTone, Tone } from '@resourcepackbuilder/ui';
import type { PackStatus, TestServerStatus } from '@resourcepackbuilder/test-server';

/** Tone per server status; the label is `media.testServer.status.<status>`. */
export const TEST_SERVER_STATUS_TONE: Record<TestServerStatus, Tone> = {
  stopped: 'neutral',
  preparing: 'busy',
  starting: 'busy',
  running: 'success',
  stopping: 'busy',
  error: 'error',
};

/** Tone per resource pack status; the label is `media.testServer.pack.<status>`. */
export const PACK_STATUS_TONE: Record<PackStatus, Tone> = {
  idle: 'neutral',
  building: 'busy',
  ready: 'success',
  failed: 'error',
};

/** Pill tone per server status (the page header); a transition is `info` because the pill has no busy state. */
export const TEST_SERVER_PILL_TONE: Record<TestServerStatus, StatusPillTone> = {
  stopped: 'muted',
  preparing: 'info',
  starting: 'info',
  running: 'ok',
  stopping: 'info',
  error: 'error',
};

/** Pill tone per resource pack status. */
export const PACK_PILL_TONE: Record<PackStatus, StatusPillTone> = {
  idle: 'muted',
  building: 'info',
  ready: 'ok',
  failed: 'error',
};
