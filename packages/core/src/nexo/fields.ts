/**
 * Description of form fields. The UI renders these fields generically,
 * the values end up 1:1 in the item's config object (= the later YAML).
 */
import type { Option } from './options';

interface BaseField {
  /** Key within the parent object. "*" = all remaining keys (map only) */
  key: string;
  /**
   * Description (as tooltip) – message key in the `schema` namespace. The original English name is
   * displayed as the title, see fieldName(). May be '' for the value object of a map entry.
   */
  label: string;
  /** Original English name, if it cannot be derived from the key (not translated) */
  name?: string;
  /** Help text below the field – message key in the `schema` namespace */
  help?: string;
  /** Only show the field if a sibling field has one of these values */
  showIf?: { key: string; values: Array<string | boolean | number> };
  /** Required Minecraft version for this field */
  minVersion?: string;
}

export interface TextField extends BaseField {
  type: 'text';
  /** Placeholder text – message key in the `schema` namespace */
  placeholder?: string;
  suggestions?: Option[];
  /** Additional meaning for display and validation */
  format?: 'minimessage' | 'duration' | 'vector' | 'resource' | 'color' | 'range';
  multiline?: boolean;
}

export interface NumberField extends BaseField {
  type: 'number';
  integer?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** Placeholder text – message key in the `schema` namespace */
  placeholder?: string;
}

/** Three states: unset / true / false */
export interface BooleanField extends BaseField {
  type: 'boolean';
  /** Nexo default value when unset (display only) */
  defaultHint?: boolean;
}

export interface SelectField extends BaseField {
  type: 'select';
  options: Option[];
  allowCustom?: boolean;
  /** Placeholder text – message key in the `schema` namespace */
  placeholder?: string;
}

/** List of strings. With `singleAsString`, a single value is written when there is exactly one entry. */
export interface StringListField extends BaseField {
  type: 'stringList';
  /** Placeholder text – message key in the `schema` namespace */
  placeholder?: string;
  suggestions?: Option[];
  format?: TextField['format'];
  singleAsString?: boolean;
}

export interface MultiSelectField extends BaseField {
  type: 'multiSelect';
  options: Option[];
}

export interface ObjectField extends BaseField {
  type: 'object';
  fields: Field[];
  /** Written instead of an empty object (e.g. `preview_placement: true`) */
  emptyValue?: true;
}

export interface ObjectListField extends BaseField {
  type: 'objectList';
  fields: Field[];
  /** Name of one entry (e.g. on the add button) – message key in the `schema` namespace */
  itemLabel: string;
  /** Field whose value is shown as the title of an entry */
  titleKey?: string;
  newItem?: () => Record<string, unknown>;
}

export interface MapField extends BaseField {
  type: 'map';
  /** Label of the entry key – message key in the `schema` namespace */
  keyLabel: string;
  keyOptions?: Option[];
  /** Placeholder of the entry key – message key in the `schema` namespace */
  keyPlaceholder?: string;
  /** Field for the value of an entry (key is ignored) */
  value: Field;
  /** Keys taken by other fields in the same object */
  reservedKeys?: string[];
  newValue?: () => unknown;
}

export interface YamlField extends BaseField {
  type: 'yaml';
  /** Placeholder text – message key in the `schema` namespace */
  placeholder?: string;
}

/** Checkbox that writes an empty object `{}` when enabled (e.g. CLEAR_ALL_EFFECTS). */
export interface PresenceField extends BaseField {
  type: 'presence';
}

/** Upload of an additional PNG (e.g. armor texture). The value is "@asset:<id>". */
export interface TextureField extends BaseField {
  type: 'texture';
  /** Expected size as a hint, e.g. "64×32" */
  sizeHint?: string;
}

export type Field =
  | TextField
  | NumberField
  | BooleanField
  | SelectField
  | StringListField
  | MultiSelectField
  | ObjectField
  | ObjectListField
  | MapField
  | YamlField
  | PresenceField
  | TextureField;

/* ------------------------------------------------------------------ Validation of single values */

const DURATION = /^\d+(\.\d+)?(t|ms|s|m|h|d|w|mo)?$/;
const VECTOR = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const COLOR = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;
const RANGE = /^-?\d+(\.\d+)?(\.\.-?\d+(\.\d+)?)?$/;

/**
 * Checks a text value against its format.
 * @returns null if valid, otherwise a message key in the `schema` namespace (`validation.*`)
 */
export function validateTextFormat(format: TextField['format'], value: string): string | null {
  // "@model" = the item's model (replaced on export)
  if (!value || value === '@model') return null;
  switch (format) {
    case 'duration':
      return DURATION.test(value.trim()) ? null : 'validation.duration';
    case 'vector':
      return VECTOR.test(value) ? null : 'validation.vector';
    case 'color': {
      const m = COLOR.exec(value);
      if (!m) return 'validation.color';
      return [m[1], m[2], m[3]].every((n) => Number(n) <= 255) ? null : 'validation.colorRange';
    }
    case 'range':
      return RANGE.test(value.trim()) ? null : 'validation.range';
    case 'resource':
      return /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/.test(value.trim()) ? null : 'validation.resource';
    default:
      return null;
  }
}

const ACRONYMS: Record<string, string> = { id: 'ID', gui: 'GUI', uuid: 'UUID', xp: 'XP', ui: 'UI', nbt: 'NBT' };

/** English display name from a YAML key: max_stack_size → Max Stack Size, layer1 → Layer 1 */
export function englishName(key: string): string {
  return key
    .replace(/^\$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([a-zA-Z])(\d)/g, '$1_$2')
    .split(/[_\s.-]+/)
    .filter(Boolean)
    .map((w) => ACRONYMS[w.toLowerCase()] ?? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Name of a field as it appears in the Nexo docs (English, not translated).
 * Falls back to `label` (a `schema` message key) only for fields without name and key.
 */
export function fieldName(field: { key: string; label: string; name?: string }): string {
  if (field.name) return field.name;
  if (field.key && field.key !== '*') return englishName(field.key);
  return field.label;
}
