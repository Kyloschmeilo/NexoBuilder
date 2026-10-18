/**
 * Description of form fields. The UI renders these fields generically; the values end up 1:1 in the
 * item's config object (= the later YAML) – or in `item.armor` for the armor settings.
 */
import { RESOURCE_LOCATION_PATTERN } from '@resourcepackbuilder/minecraft';
import { type LabelKey, MODEL_TOKEN } from '@resourcepackbuilder/utils';
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
  /** URL of the field's section in the plugin's documentation, when it has one of its own */
  docs?: string;
  /** A field few items need, which the editor may tuck away behind the common ones */
  advanced?: boolean;
  /**
   * Name of a hand-written editor the UI shows instead of the generic one of the field's type (e.g. a furniture's
   * hitbox entries read into their parts); the value and its checks stay those of the type.
   */
  editor?: string;
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
  /** Name of a list of options the editor adds from the open project (see {@link StringListField}) */
  dynamicSuggestions?: string;
}

/** List of strings. With `singleAsString`, a single value is written when there is exactly one entry. */
export interface StringListField extends BaseField {
  type: 'stringList';
  suggestions?: Option[];
  format?: TextField['format'];
  singleAsString?: boolean;
  /** Name of a list of suggestions the editor adds from the open project (e.g. CraftEngine's 'templates') */
  dynamicSuggestions?: string;
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
  /**
   * The entries are told apart by the value of the field `key`, which names a type of `types` (e.g. a CraftEngine
   * event by its trigger in `on`). Editors may show each entry as a card of that type and add entries by picking one.
   * Checking and pruning go by `fields` as for any object list.
   */
  typedBy?: { key: string; catalog: string; types: () => readonly TypedType[] };
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

/**
 * One type of a {@link TypedListField} (or of a {@link NumberProviderField}'s object form): the value of the entry's
 * `type` key and the fields an entry of that type has. A target builds these from its catalog (e.g. CraftEngine's
 * conditions in core/craftEngine/logic).
 */
export interface TypedType {
  type: string;
  /** Name of the type – message key in the form's namespace */
  label: string;
  /** Short description – message key in the form's namespace */
  help?: string;
  /** The keys of an entry besides `type` */
  fields: Field[];
  /** Only the paid edition of the plugin reads this type */
  premium?: boolean;
  /** URL of the type's page (or section) in the plugin's documentation */
  docs?: string;
  /** Sub-group of the catalog the type is listed under (e.g. `player` for functions acting on players) */
  category?: string;
  /** Name of the type's `category` – message key in the form's namespace */
  categoryLabel?: string;
}

/**
 * A list of objects switched by their `type` key; each entry shows the fields of its type. Entries of a type the
 * catalog does not know are kept unchanged (the editor shows them as YAML).
 */
export interface TypedListField extends BaseField {
  type: 'typedList';
  /** Name of the catalog the types come from (e.g. 'conditions') */
  catalog: string;
  /** The catalog's types. A function, as catalogs contain themselves (an `all_of` condition holds conditions) */
  types: () => readonly TypedType[];
  /** A leading "!" on `type` inverts the entry (CraftEngine conditions) */
  invertible?: boolean;
}

/**
 * A number, a text the plugin reads as one (`1~3`, an expression), or an object switched by `type` such as
 * `{ type: uniform, min: 1, max: 3 }` (CraftEngine's number providers). Unknown object types are kept unchanged.
 */
export interface NumberProviderField extends BaseField {
  type: 'numberProvider';
  /** Name of the catalog the object types come from (e.g. 'numbers') */
  catalog: string;
  types: () => readonly TypedType[];
}

/** One form a {@link ChoiceField}'s value can take, with the field that edits it. */
export interface ChoiceOption {
  id: string;
  /** Name of the form – message key in the form's namespace */
  label: string;
  /** The field that edits a value of this form */
  field: Field;
  /** Whether a value has this form */
  matches: (value: unknown) => boolean;
  /** The value a switch to this form starts with */
  newValue: () => unknown;
}

/**
 * A value that takes one of several forms, each edited by its own field (e.g. a CraftEngine loot table: a template
 * with arguments, a table of pools, or the id of another table). The first choice whose `matches` holds edits and
 * checks the value; a value no choice matches is kept unchanged.
 */
export interface ChoiceField extends BaseField {
  type: 'choice';
  choices: ChoiceOption[];
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
  | TextureField
  | TypedListField
  | NumberProviderField
  | ChoiceField;

/** The choice whose form a value has, if any. */
export function findChoice(field: ChoiceField, value: unknown): ChoiceOption | undefined {
  return field.choices.find((choice) => choice.matches(value));
}

/** The type an entry's `type` value names (a leading "!" inverts it when `invertible`), if the catalog knows it. */
export function findTypedType(field: { types: () => readonly TypedType[]; invertible?: boolean }, entry: unknown): TypedType | undefined {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return undefined;
  const value = (entry as Record<string, unknown>).type;
  if (typeof value !== 'string') return undefined;
  const type = field.invertible && value.startsWith('!') ? value.slice(1) : value;
  return field.types().find((t) => t.type === type);
}

// English display names of YAML keys – shown as field titles as they appear in the Nexo docs (not translated)

const ACRONYMS: Record<string, string> = { id: 'ID', gui: 'GUI', uuid: 'UUID', xp: 'XP', ui: 'UI', nbt: 'NBT' };

/** max_stack_size → Max Stack Size, layer1 → Layer 1 */
export function englishName(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([a-zA-Z])(\d)/g, '$1_$2')
    .split(/[_\s.-]+/)
    .filter(Boolean)
    .map((w) => ACRONYMS[w.toLowerCase()] ?? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Name of a field as it appears in the Nexo docs.
 * Falls back to `label` (a `schema` message key) only for fields without name and key.
 */
export function fieldName(field: { key: string; label: string; name?: string }): string {
  if (field.name) return field.name;
  if (field.key && field.key !== '*') return englishName(field.key);
  return field.label;
}

// Validation of single text values against their field format (duration, vector, color …)

const DURATION = /^\d+(\.\d+)?(t|ms|s|m|h|d|w|mo)?$/;
const VECTOR = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const COLOR = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;
const RANGE = /^-?\d+(\.\d+)?(\.\.-?\d+(\.\d+)?)?$/;

/**
 * Checks a text value against its format.
 * @returns null if valid, otherwise a message key in the `schema` namespace (`validation.*`)
 */
export function validateTextFormat(format: TextField['format'], value: string): LabelKey | null {
  if (!value || value === MODEL_TOKEN) return null;
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
      return RESOURCE_LOCATION_PATTERN.test(value.trim()) ? null : 'validation.resource';
    default:
      return null;
  }
}
