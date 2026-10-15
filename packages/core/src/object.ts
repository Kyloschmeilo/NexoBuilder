/** Helpers for plain JSON-like objects. */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/** Deep copy of plain data (no functions; Immer drafts must be passed through `current()` first). */
export function deepClone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Recursively merges `patch` into `base` (objects are merged, everything else is replaced).
 * Returns a new object; the inputs are not modified.
 */
export function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];
    result[key] = isPlainObject(existing) && isPlainObject(value) ? deepMerge(existing, value) : value;
  }
  return result;
}
