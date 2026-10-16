/**
 * Reading JSON text from untrusted sources (dropped files, project files, shared folders): parse, then check the
 * shape with a zod schema. Every caller gets either the typed value or a {@link CoreError} – never a cast.
 */
import type { z } from 'zod';
import { CoreError, type IssueCode, type MessageArgs } from './issues';

export type JsonResult<T> = { ok: true; value: T } | { ok: false; error: CoreError };

/** Error codes (message keys in `issues`) for text that is no JSON (`syntax`, gets an `error` arg) or has the wrong shape. */
export interface JsonErrorCodes {
  syntax?: IssueCode;
  shape?: IssueCode;
  /** Args of both errors, e.g. the file name */
  args?: MessageArgs;
}

/** Parses `text` and checks it against `schema`. */
export function parseJson<S extends z.ZodType>(text: string, schema: S, codes: JsonErrorCodes = {}): JsonResult<z.output<S>> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      error: new CoreError(codes.syntax ?? 'file.invalidJson', { ...codes.args, error: err instanceof Error ? err.message : String(err) }),
    };
  }
  const parsed = schema.safeParse(raw);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: new CoreError(codes.shape ?? 'file.unexpectedContent', codes.args) };
}

/** The value of a {@link JsonResult}; throws its error. */
export function unwrapJson<T>(result: JsonResult<T>): T {
  if (!result.ok) throw result.error;
  return result.value;
}

/** The value of a {@link JsonResult}, or null when it failed (for sources where bad files are simply skipped). */
export function jsonOrNull<T>(result: JsonResult<T>): T | null {
  return result.ok ? result.value : null;
}
