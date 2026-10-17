/**
 * Lets the UI write what is still pending (autosave, shared folder) before its window closes: Electron does not wait
 * for async work in `beforeunload`. A closing window is held back until the UI answers its flush request, at most
 * {@link FLUSH_TIMEOUT_MS}; a quit that closed it is then resumed.
 */
import { app, type BrowserWindow, type WebContents } from 'electron';
import { handle, send } from './ipc';

/** How long a closing window waits for the UI (a UI that hangs must not keep the window open). */
const FLUSH_TIMEOUT_MS = 3000;

let lastRequestId = 0;
const waiting = new Map<number, () => void>();
/** A quit is under way: once a held-back window may close, the quit is started again. */
let isQuitPending = false;

/** Asks the UI in `contents` to write what is pending; resolves on its answer, after the timeout or when it is gone. */
function requestFlush(contents: WebContents): Promise<void> {
  if (contents.isDestroyed() || contents.isCrashed()) return Promise.resolve();
  const id = ++lastRequestId;
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      waiting.delete(id);
      contents.off('render-process-gone', finish);
      contents.off('destroyed', finish);
      resolve();
    };
    const timer = setTimeout(finish, FLUSH_TIMEOUT_MS);
    waiting.set(id, finish);
    contents.once('render-process-gone', finish);
    contents.once('destroyed', finish);
    send(contents, 'app:flush-request', id);
  });
}

/** Registers the UI's answer channel. */
export function registerFlushHandler(): void {
  handle('app:flushed', (_event, id) => waiting.get(id)?.());
}

/** A quit is going ahead (no `before-quit` listener held it back): windows it closes are flushed, then it resumes. */
export function noteQuit(): void {
  isQuitPending = true;
}

/** Holds `window` back on close until its UI has written what is pending. */
export function flushBeforeClose(window: BrowserWindow): void {
  let state: 'open' | 'flushing' | 'flushed' = 'open';
  window.on('close', (event) => {
    if (state === 'flushed') return;
    // Holding the window back cancels a quit that closes it; it is started again below
    event.preventDefault();
    if (state === 'flushing') return;
    state = 'flushing';
    void requestFlush(window.webContents).then(() => {
      state = 'flushed';
      if (window.isDestroyed()) return;
      if (isQuitPending) {
        isQuitPending = false;
        app.quit();
      } else {
        window.close();
      }
    });
  });
}
