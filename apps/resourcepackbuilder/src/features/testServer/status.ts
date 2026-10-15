import type { Tone } from '@resourcepackbuilder/ui';
import type { PackStatus, TestServerStatus } from '../../platform/desktopApi';

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

/** The server is on its way between stopped and running. */
export function isTransitioning(status: TestServerStatus): boolean {
  return status === 'preparing' || status === 'starting' || status === 'stopping';
}

/** Settings that only apply on start cannot be changed while the server is up (or on its way). */
export function isConfigLocked(status: TestServerStatus): boolean {
  return status !== 'stopped' && status !== 'error';
}
