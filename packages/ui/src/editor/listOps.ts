/**
 * Immutable edits of the arrays and string-keyed maps that `ListEditor` and `MapEditor` edit. Each returns a new
 * value and leaves its input untouched; map edits keep the order of the keys.
 */

/** `list` with the entry at `from` moved to `to` (both clamped to the list). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

/** `list` without the entry at `index`. */
export function removeItem<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

/** `list` with `item` inserted before `index` (at the end for `index >= length`). */
export function insertItem<T>(list: readonly T[], index: number, item: T): T[] {
  return [...list.slice(0, index), item, ...list.slice(index)];
}

/** `list` with the entry at `index` replaced by `item`. */
export function replaceItem<T>(list: readonly T[], index: number, item: T): T[] {
  return list.map((entry, i) => (i === index ? item : entry));
}

/** Why a key cannot be added to (or a key renamed to in) a map: empty after trimming, or already in use. */
export type MapKeyProblem = 'empty' | 'taken';

/**
 * Checks a new key for `map`. `reserved` keys belong to other fields of the same object; `current` is the key being
 * renamed, which may keep its own name.
 */
export function mapKeyProblem(
  map: Readonly<Record<string, unknown>>,
  key: string,
  reserved: readonly string[] = [],
  current?: string,
): MapKeyProblem | null {
  const trimmed = key.trim();
  if (!trimmed) return 'empty';
  if (trimmed === current) return null;
  return Object.hasOwn(map, trimmed) || reserved.includes(trimmed) ? 'taken' : null;
}

/** `map` with `oldKey` renamed to `newKey` in the same position; unchanged when `newKey` is taken or missing. */
export function renameMapKey<V>(map: Readonly<Record<string, V>>, oldKey: string, newKey: string): Record<string, V> {
  if (oldKey === newKey || !Object.hasOwn(map, oldKey) || Object.hasOwn(map, newKey)) return { ...map };
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key === oldKey ? newKey : key, value]));
}

/** `map` without `key`. */
export function removeMapKey<V>(map: Readonly<Record<string, V>>, key: string): Record<string, V> {
  return Object.fromEntries(Object.entries(map).filter(([entryKey]) => entryKey !== key));
}

/** `map` with `value` set under `key` (a new key goes to the end). */
export function setMapValue<V>(map: Readonly<Record<string, V>>, key: string, value: V): Record<string, V> {
  return { ...map, [key]: value };
}
