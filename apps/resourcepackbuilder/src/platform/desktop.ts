/**
 * Functions only the desktop program provides (Electron; the preload script exposes them as
 * `window.resourcepackBuilder`). In the browser they are missing – there, e.g. sharing via a folder is not available.
 *
 * Failed calls are rejected by the preload script with a plain `{ code, args }` payload; they are turned back into a
 * `DesktopError` here, which `useErrorMessage` translates.
 */
import { rehydrateDesktopError } from '@resourcepackbuilder/desktop-contract/errors';
import type { DesktopApi } from './desktopApi';

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

/** The desktop program's functions, or `null` in the browser. */
export function desktopApi(): DesktopApi | null {
  const source = typeof window === 'undefined' ? undefined : window.resourcepackBuilder;
  if (!source) return null;
  return { app: withDesktopErrors(source.app), share: withDesktopErrors(source.share), testServer: withDesktopErrors(source.testServer) };
}
