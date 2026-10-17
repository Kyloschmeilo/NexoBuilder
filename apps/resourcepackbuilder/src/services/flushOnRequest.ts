/**
 * Answers the desktop program's flush requests: before the window closes, everything pending is written (the shared
 * folder first, because writing it produces a sync state the autosave stores) and only then the window may close.
 */
import type { DesktopAppApi } from '../platform/desktopApi';

/** Writes what is pending on every request and then answers it, also when writing failed. Returns the unsubscribe. */
export function answerFlushRequests(api: Pick<DesktopAppApi, 'onFlushRequest' | 'flushed'>, flush: () => Promise<void>): () => void {
  return api.onFlushRequest((requestId) => {
    void flush()
      .catch((err: unknown) => console.warn('Could not write everything before closing', err))
      .then(() => api.flushed(requestId))
      .catch(() => undefined);
  });
}
