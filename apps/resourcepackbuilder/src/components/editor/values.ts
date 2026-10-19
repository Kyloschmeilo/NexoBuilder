/** Pure helpers of the field editors: visibility, value shapes and immutable list/object updates. */
import type { Field, TypedType } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';

/** Field types that take the full width of the form grid. */
const WIDE_TYPES = new Set<Field['type']>([
  'object',
  'objectList',
  'map',
  'yaml',
  'stringList',
  'multiSelect',
  'texture',
  'presence',
  'typedList',
  'choice',
]);

/** Whether a field takes the full width of the form (lists, objects, multiline text…). */
export function isWideField(field: Field): boolean {
  return (field.type === 'text' && !!field.multiline) || WIDE_TYPES.has(field.type);
}

/** Objects with more fields than this tuck their unflagged fields with a known plugin default into "More options". */
const ADVANCED_HEURISTIC_MIN_FIELDS = 5;

/**
 * Whether a field goes into "More options": the schema marks it `advanced`, or, in an object of at least five fields,
 * it is an optional field with a known plugin default (`defaultHint`), which most items leave unset.
 */
function isAdvancedField(field: Field, fieldCount: number): boolean {
  if (field.advanced !== undefined) return field.advanced;
  return fieldCount >= ADVANCED_HEURISTIC_MIN_FIELDS && field.type === 'boolean' && field.defaultHint !== undefined;
}

/**
 * The fields of an object in display order: the common ones first (simple fields, then wide ones), and apart from them
 * the fields the editor tucks into "More options" (see {@link isAdvancedField}). The heuristic never leaves an object
 * with fewer than two common fields.
 */
export function arrangeObjectFields(fields: readonly Field[]): { common: Field[]; advanced: Field[] } {
  const byWidth = (list: Field[]) => [...list.filter((f) => !isWideField(f)), ...list.filter(isWideField)];
  const flagged = fields.filter((f) => f.advanced);
  const guessed = fields.filter((f) => isAdvancedField(f, fields.length));
  const advanced = fields.length - guessed.length >= 2 ? guessed : flagged;
  return { common: byWidth(fields.filter((f) => !advanced.includes(f))), advanced: byWidth(advanced) };
}

/** The control a choice of `count` options gets: segments up to 4, a select up to 12, a searchable combobox above. */
export type ChoiceControl = 'segmented' | 'select' | 'combobox';

export function choiceControl(count: number): ChoiceControl {
  if (count <= 4) return 'segmented';
  return count <= 12 ? 'select' : 'combobox';
}

/** The three components of a vector value. */
export type VectorParts = readonly [string, string, string];

const VECTOR_TEXT = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

/** The components of a vector "x,y,z"; empty parts for no value; undefined for text that is no vector. */
export function parseVector(value: unknown): VectorParts | undefined {
  if (value === undefined || value === null || value === '') return ['', '', ''];
  if (typeof value !== 'string') return undefined;
  const m = VECTOR_TEXT.exec(value);
  return m ? [m[1], m[2], m[3]] : undefined;
}

/**
 * The vector value of three typed components: "x,y,z" once all three are numbers, undefined when all are empty, and
 * null while the input is incomplete or invalid (nothing is written then).
 */
export function formatVector(parts: VectorParts): string | undefined | null {
  const trimmed = parts.map((part) => part.trim().replace(',', '.'));
  if (trimmed.every((part) => part === '')) return undefined;
  const numbers = trimmed.map((part) => parseNumber(part));
  return numbers.every((n) => n !== undefined) ? numbers.join(',') : null;
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

/** The parts of a typed entry's `type`: the type's name and whether a leading "!" inverts it. */
export function typeParts(type: unknown, invertible?: boolean): { name: string; inverted: boolean } {
  const text = typeof type === 'string' ? type : '';
  return invertible && text.startsWith('!') ? { name: text.slice(1), inverted: true } : { name: text, inverted: false };
}

/**
 * A typed entry with a new `type` value. Switching to a known type keeps only the keys that type has too; while the
 * type is unknown (e.g. half typed) every key stays.
 */
export function withEntryType(entry: Record<string, unknown>, type: string, known: TypedType | undefined): Record<string, unknown> {
  const keys = known && new Set(known.fields.map((f) => f.key));
  const rest = Object.entries(entry).filter(([key]) => key !== 'type' && (!keys || keys.has(key)));
  return type ? { type, ...Object.fromEntries(rest) } : Object.fromEntries(rest);
}
