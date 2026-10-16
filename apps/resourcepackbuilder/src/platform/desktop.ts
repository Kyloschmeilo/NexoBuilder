/**
 * Functions only the desktop program provides (Electron; the preload script exposes them as
 * `window.resourcepackBuilder`). In the browser they are missing – there, e.g. sharing via a folder is not available.
 *
 * Failed calls are rejected by the preload script with a plain `{ code, args }` payload; they are turned back into a
 * `DesktopError` here, which `useErrorMessage` translates.
 */
import { rehydrateDesktopError } from '@resourcepackbuilder/desktop-contract/errors';
import type { DesktopApi, DesktopAppApi, DesktopShareApi, DesktopTestServerApi } from './desktopApi';

/** `methods` with every returned promise rejecting as a `DesktopError` instead of a plain payload. */
function withDesktopErrors<T extends object>(methods: T): T {
  return Object.fromEntries(
    Object.entries(methods).map(([name, method]) => [
      name,
      (...args: unknown[]) => {
        const result: unknown = (method as (...args: unknown[]) => unknown)(...args);
        return isThenable(result) ? Promise.resolve(result).catch((err: unknown) => Promise.reject(rehydrateDesktopError(err))) : result;
      },
    ]),
  ) as T;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null)?.then === 'function';
}

let wrapped: { source: DesktopApi; api: DesktopApi } | null = null;

function desktop(): DesktopApi | null {
  const source = typeof window === 'undefined' ? undefined : window.resourcepackBuilder;
  if (!source) return null;
  if (wrapped?.source !== source) {
    wrapped = {
      source,
      api: { app: withDesktopErrors(source.app), share: withDesktopErrors(source.share), testServer: withDesktopErrors(source.testServer) },
    };
  }
  return wrapped.api;
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
