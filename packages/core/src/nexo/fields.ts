/**
 * Description of form fields. The UI renders these fields generically; the values end up 1:1 in the
 * item's config object (= the later YAML) – or in `item.armor` for the armor settings.
 */
import type { Option } from './options';

export interface BaseField {
  /** Key within the parent object. "*" = all remaining keys (map only) */
  key: string;
  /**
   * Description (as tooltip) – message key in the `schema` namespace. The original English name is
   * displayed as the title, see fieldName(). '' for the object value of a map entry (the entry key is its title).
   */
  label: string;
  /** Original English name, if it cannot be derived from the key (not translated) */
  name?: string;
  /** Help text below the field – message key in the `schema` namespace */
  help?: string;
  /** Placeholder text – message key in the `schema` namespace */
  placeholder?: string;
  /** Only show the field if a sibling field has one of these values */
  showIf?: { key: string; values: Array<string | boolean | number> };
  /** Required Minecraft version for this field */
  minVersion?: string;
}

export interface TextField extends BaseField {
  type: 'text';
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
}

/** List of strings. With `singleAsString`, a single value is written when there is exactly one entry. */
export interface StringListField extends BaseField {
  type: 'stringList';
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
