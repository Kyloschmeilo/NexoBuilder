import type { Tone } from '@resourcepackbuilder/ui';
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
