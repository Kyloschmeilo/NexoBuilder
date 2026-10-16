/** Pure helpers of the field editors: visibility, value shapes and immutable list/object updates. */
import type { Field } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';

/** Field types that take the full width of the form grid. */
const WIDE_TYPES = new Set<Field['type']>(['object', 'objectList', 'map', 'yaml', 'stringList', 'multiSelect', 'texture', 'presence']);

/** Whether a field takes the full width of the form (lists, objects, multiline text…). */
export function isWideField(field: Field): boolean {
  return (field.type === 'text' && !!field.multiline) || WIDE_TYPES.has(field.type);
}

/** Applies `showIf`: a field is hidden unless the sibling it depends on has one of the listed values. */
export function isFieldVisible(field: Field, siblings: Record<string, unknown> | undefined): boolean {
  if (!field.showIf || !siblings) return true;
  const current = siblings[field.showIf.key];
  return field.showIf.values.some((value) => value === current);
}

/** Number of keys of an object that hold a value (not undefined, null or ''). */
export function countSetValues(value: unknown): number {
  if (!isPlainObject(value)) return 0;
  return Object.values(value).filter((v) => v !== undefined && v !== null && v !== '').length;
}

/** `object` with `key` set to `value`, or removed when `value` is undefined. */
export function withKey(object: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const next = { ...object };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

/** `object` with `oldKey` renamed to `newKey`, keeping the key order. */
export function renameKey(object: Record<string, unknown>, oldKey: string, newKey: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(object).map(([k, v]) => [k === oldKey ? newKey : k, v]));
}

/** The entries of `object` whose keys are not in `known` (the "*" field of an object). */
export function unknownEntries(object: Record<string, unknown>, known: ReadonlySet<string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(object).filter(([k]) => !known.has(k)));
}

/** `object` with its unknown entries replaced by `rest`. */
export function withUnknownEntries(object: Record<string, unknown>, known: ReadonlySet<string>, rest: unknown): Record<string, unknown> {
  const next = Object.fromEntries(Object.entries(object).filter(([k]) => known.has(k)));
  return isPlainObject(rest) ? { ...next, ...rest } : next;
}

/** A list value as strings: a single string counts as a one-entry list. */
export function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => (v === null || v === undefined ? '' : String(v)));
  return typeof value === 'string' ? [value] : [];
}

/** Empty lists are stored as "not set". */
export function listOrUndefined<T>(list: T[]): T[] | undefined {
  return list.length ? list : undefined;
}

/** Empty objects are stored as "not set". */
export function objectOrUndefined(object: Record<string, unknown>): Record<string, unknown> | undefined {
  return Object.keys(object).length ? object : undefined;
}

export function insertAt<T>(list: readonly T[], index: number, entry: T): T[] {
  return [...list.slice(0, index), entry, ...list.slice(index)];
}

export function removeAt<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

export function replaceAt<T>(list: readonly T[], index: number, entry: T): T[] {
  return list.map((current, i) => (i === index ? entry : current));
}

export function moveInArray<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  const [entry] = copy.splice(from, 1);
  copy.splice(to, 0, entry);
  return copy;
}

/**
 * The new selection of a multi-select after the toggle group reported `next`: a newly picked value is
 * appended (so the stored order is the order of picking), removed values are dropped.
 */
export function toggleSelection(current: readonly string[], next: readonly string[]): string[] {
  const added = next.find((v) => !current.includes(v));
  return added !== undefined ? [...current, added] : current.filter((v) => next.includes(v));
}

/** Parses a typed number ("1.5", "-3"); undefined for empty or invalid text or a fraction where an integer is required. */
export function parseNumber(text: string, integer?: boolean): number | undefined {
  const trimmed = text.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || (integer && !Number.isInteger(n))) return undefined;
  return n;
}

const NEXO_COLOR = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;

/** Nexo colour "R, G, B" → "#rrggbb" (white for anything else). */
export function nexoColorToHex(value: string | undefined): string {
  const m = NEXO_COLOR.exec(value ?? '');
  if (!m) return '#ffffff';
  return `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}`;
}

/** "#rrggbb" → Nexo colour "R, G, B". */
export function hexToNexoColor(hex: string): string {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');
}
