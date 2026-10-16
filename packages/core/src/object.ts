/** Helpers for plain JSON-like objects. */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/** Deep copy of plain data (no functions; Immer drafts must be passed through `current()` first). */
export function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export interface MapDataOptions {
  /** What an undefined list entry becomes; by default it is removed from the list */
  listHole?: null;
  /** Lists and objects that end up empty become undefined too */
  dropEmpty?: boolean;
}

/**
 * Rebuilds plain data (lists and plain objects) bottom-up: `leaf` maps every other value. A leaf or
 * child that becomes undefined is dropped from its object and, unless `listHole` says otherwise, its list.
 */
export function mapData(value: unknown, leaf: (value: unknown) => unknown, options: MapDataOptions = {}): unknown {
  if (Array.isArray(value)) {
    const mapped = value.map((entry) => mapData(entry, leaf, options));
    const list = options.listHole === null ? mapped.map((v) => (v === undefined ? null : v)) : mapped.filter((v) => v !== undefined);
    return options.dropEmpty && list.length === 0 ? undefined : list;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const mapped = mapData(entry, leaf, options);
      if (mapped !== undefined) out[key] = mapped;
    }
    return options.dropEmpty && Object.keys(out).length === 0 ? undefined : out;
  }
  return leaf(value);
}

/** Calls `visit` for every value inside lists and objects that is neither (strings, numbers …). */
export function forEachLeaf(value: unknown, visit: (value: unknown) => void): void {
  if (Array.isArray(value)) value.forEach((entry) => forEachLeaf(entry, visit));
  else if (typeof value === 'object' && value !== null) Object.values(value).forEach((entry) => forEachLeaf(entry, visit));
  else visit(value);
}

/** Groups `values` by `key`, keeping their order within each group (and the order in which keys first appear). */
export function groupBy<T, K>(values: readonly T[], key: (value: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const value of values) {
    const k = key(value);
    const group = groups.get(k);
    if (group) group.push(value);
    else groups.set(k, [value]);
  }
  return groups;
}

/** Whether two lists have the same entries in the same order, compared by `key` (default: the entries themselves). */
export function sameList<T>(a: readonly T[], b: readonly T[], key: (value: T) => unknown = (value) => value): boolean {
  return a.length === b.length && a.every((value, i) => key(value) === key(b[i]));
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
