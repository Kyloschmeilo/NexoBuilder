/**
 * Functions only the desktop program provides (Electron, `electron/preload.cjs` exposes them as
 * `window.resourcepackBuilder`). In the browser they are missing – there, e.g. sharing via a folder is not available.
 */
import type { DesktopApi, DesktopAppApi, DesktopShareApi, DesktopTestServerApi } from './desktopApi';

function desktop(): DesktopApi | null {
  return typeof window === 'undefined' ? null : (window.resourcepackBuilder ?? null);
}

export function desktopApp(): DesktopAppApi | null {
  return desktop()?.app ?? null;
}

export function desktopShare(): DesktopShareApi | null {
  return desktop()?.share ?? null;
}

export function desktopTestServer(): DesktopTestServerApi | null {
  return desktop()?.testServer ?? null;
}
