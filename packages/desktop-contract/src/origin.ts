/** Where the desktop program serves the UI from: the static export behind its own `app://bundle` protocol. */

export const APP_SCHEME = 'app';
export const APP_HOST = 'bundle';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

/** Whether `url` is a page of the app's own UI (IPC requests from anything else are refused). */
export function isAppUrl(url: string): boolean {
  return url.startsWith(`${APP_ORIGIN}/`);
}
