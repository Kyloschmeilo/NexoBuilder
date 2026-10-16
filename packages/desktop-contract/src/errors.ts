/**
 * Errors of the desktop program as they cross IPC: a code from the `desktopErrors` message namespace plus its
 * placeholder values, so the UI words them in its own language (instead of Electron's
 * "Error invoking remote method …" with a text in whatever language the main process had).
 */
import type { MessageKey } from '@resourcepackbuilder/i18n';

/** A message key of the `desktopErrors` namespace. */
export type DesktopErrorCode = MessageKey<'desktopErrors'>;
export type DesktopErrorArgs = Record<string, string | number>;

/** The serialisable form of a {@link DesktopError}. */
export interface DesktopErrorPayload {
  code: DesktopErrorCode;
  args: DesktopErrorArgs;
}

/** An error the desktop program reports to the UI. */
export class DesktopError extends Error {
  constructor(
    readonly code: DesktopErrorCode,
    readonly args: DesktopErrorArgs = {},
  ) {
    super(code);
    this.name = 'DesktopError';
  }

  toPayload(): DesktopErrorPayload {
    return { code: this.code, args: this.args };
  }
}

/** What the main process answers to every invoke: the result, or the error the handler failed with. */
export type InvokeOutcome<T> = { ok: true; value: T } | { ok: false; error: DesktopErrorPayload };

export function isDesktopErrorPayload(value: unknown): value is DesktopErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const { code, args } = value as Record<string, unknown>;
  return typeof code === 'string' && typeof args === 'object' && args !== null;
}

/** Any thrown value as a payload; errors without a code keep their own message (`unexpected`). */
export function toDesktopErrorPayload(err: unknown): DesktopErrorPayload {
  if (err instanceof DesktopError) return err.toPayload();
  return { code: 'unexpected', args: { message: err instanceof Error ? err.message : String(err) } };
}

/** Turns a payload received over IPC back into a {@link DesktopError}; anything else is returned unchanged. */
export function rehydrateDesktopError(value: unknown): unknown {
  return isDesktopErrorPayload(value) ? new DesktopError(value.code, value.args) : value;
}
