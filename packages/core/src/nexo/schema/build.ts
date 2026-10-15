/**
 * Builder for the property schema. Properties are written as field specs without message keys; the
 * builder derives every key from the position in the tree:
 *
 *  - property `<id>` (e.g. `Components.food`): YAML path `id.split('.')`, field key = last path segment,
 *    messages under `properties.<camel(id)>` (`label`, `description`, optional `hint`), its field under `….field`
 *  - field at scope S: `S.label`, `S.help`, `S.placeholder`, `S.itemLabel` (object lists),
 *    `S.keyLabel`/`S.keyPlaceholder` (maps), inline options `S.options.<camel(value)>.label`
 *  - child `key` of an object field: scope `S.fields.<camel(key)>` (`*` = remaining keys → `S.fields.entries`)
 *  - value of a map field: scope `S.value`
 *
 * Shared field definitions set an explicit `scope` (e.g. `shared.drop`); explicit keys override single messages.
 */
import type { ConfigValue } from '../../project/types';
import type { Field, MapField, ObjectField, ObjectListField } from '../fields';
import { keySegment } from '../messageKey';
import { labeledOptions, type Option } from '../options';

export type PropertyGroup = 'general' | 'appearance' | 'attributes' | 'components' | 'mechanics';

interface PropertyBase {
  id: string;
  group: PropertyGroup;
  /** Message key in the `schema` namespace (the English Nexo feature name in both languages) */
  label: string;
  /** Message key in the `schema` namespace */
  description: string;
  field: Field;
  defaultValue: () => ConfigValue;
  minVersion?: string;
  /** Last version in which the property exists */
  maxVersion?: string;
  /** These properties are mutually exclusive */
  conflicts?: string[];
  /** Hint shown above the form – message key in the `schema` namespace */
  hint?: string;
  docs?: string;
  /** Write an empty object anyway (mechanic active, even without options) */
  keepEmpty?: boolean;
}

/** A property stored in the item config (= the YAML) */
export interface ConfigPropertyDef extends PropertyBase {
  storage: 'config';
  /** Path in the item YAML, e.g. ['Components', 'food'] */
  path: string[];
}

/** The armor settings: stored in `item.armor`, never written to the YAML as they are */
export interface ArmorPropertyDef extends PropertyBase {
  storage: 'armor';
}

export type PropertyDef = ConfigPropertyDef | ArmorPropertyDef;

/* ====================================================================== Field specs */

/** Field properties the builder derives */
type Derived = 'key' | 'label' | 'help' | 'placeholder' | 'itemLabel' | 'keyLabel' | 'keyPlaceholder' | 'fields' | 'value' | 'options';

interface SpecMessages {
  /** Message scope of this field (default: derived from the position) */
  scope?: string;
  /** Explicit label key instead of `<scope>.label` */
  label?: string;
  /** The field has a help text at `<scope>.help` */
  help?: boolean;
  /** `true`: placeholder at `<scope>.placeholder`; a string is an explicit message key */
  placeholder?: boolean | string;
}

/** Child fields by YAML key, in display order */
export interface FieldSpecs {
  [key: string]: FieldSpec;
}

interface MapValueSpec {
  value: FieldSpec;
  /** The entry key has a placeholder at `<scope>.keyPlaceholder` */
  keyPlaceholder?: boolean;
}

interface OptionsSpec {
  /** Option lists, or plain values that get labels at `<scope>.options.<camel(value)>.label` */
  options: Option[] | string[];
}

type SpecOf<F extends Field> = Omit<F, Derived> &
  SpecMessages &
  (F extends { fields: Field[] } ? { fields: FieldSpecs } : unknown) &
  (F extends { value: Field } ? MapValueSpec : unknown) &
  (F extends { options: Option[] } ? OptionsSpec : unknown);

export type FieldSpec = { [T in Field['type']]: SpecOf<Extract<Field, { type: T }>> }[Field['type']];

type SpecFor<T extends Field['type']> = Extract<FieldSpec, { type: T }>;
type SpecOptions<T extends Field['type'], K extends PropertyKey = never> = Omit<SpecFor<T>, 'type' | K>;

/** Constructors for field specs */
export const field = {
  text: (options: SpecOptions<'text'> = {}): SpecFor<'text'> => ({ type: 'text', ...options }),
  number: (options: SpecOptions<'number'> = {}): SpecFor<'number'> => ({ type: 'number', ...options }),
  boolean: (options: SpecOptions<'boolean'> = {}): SpecFor<'boolean'> => ({ type: 'boolean', ...options }),
  stringList: (options: SpecOptions<'stringList'> = {}): SpecFor<'stringList'> => ({ type: 'stringList', ...options }),
  yaml: (options: SpecOptions<'yaml'> = {}): SpecFor<'yaml'> => ({ type: 'yaml', ...options }),
  presence: (options: SpecOptions<'presence'> = {}): SpecFor<'presence'> => ({ type: 'presence', ...options }),
  texture: (options: SpecOptions<'texture'> = {}): SpecFor<'texture'> => ({ type: 'texture', ...options }),
  select: (options: Option[] | string[], rest: SpecOptions<'select', 'options'> = {}): SpecFor<'select'> => ({ type: 'select', options, ...rest }),
  multiSelect: (options: Option[] | string[], rest: SpecOptions<'multiSelect', 'options'> = {}): SpecFor<'multiSelect'> => ({
    type: 'multiSelect',
    options,
    ...rest,
  }),
  object: (fields: FieldSpecs, rest: SpecOptions<'object', 'fields'> = {}): SpecFor<'object'> => ({ type: 'object', fields, ...rest }),
  objectList: (fields: FieldSpecs, rest: SpecOptions<'objectList', 'fields'> = {}): SpecFor<'objectList'> => ({ type: 'objectList', fields, ...rest }),
  map: (value: FieldSpec, rest: SpecOptions<'map', 'value'> = {}): SpecFor<'map'> => ({ type: 'map', value, ...rest }),
};

/** Shows a field only while its sibling `type` has one of these values */
export const whenType = (...values: string[]) => ({ showIf: { key: 'type', values } });

/* ====================================================================== Resolution */

function isValueList(options: Option[] | string[]): options is string[] {
  return options.every((option) => typeof option === 'string');
}

function resolveOptions(options: Option[] | string[], scope: string): Option[] {
  return isValueList(options) ? labeledOptions(`${scope}.options`, options) : options;
}

function resolveFields(specs: FieldSpecs, scope: string): Field[] {
  return Object.entries(specs).map(([key, spec]) => resolveField(spec, key, `${scope}.fields.${key === '*' ? 'entries' : keySegment(key)}`));
}

/**
 * The spec without its message options, plus the resolved message keys.
 * The object value of a map entry has no label of its own (the entry key is its title).
 */
function split<S extends FieldSpec>(spec: S, key: string, defaultScope: string, isMapValue: boolean) {
  const { scope = defaultScope, label, help, placeholder, ...rest } = spec;
  const messages = {
    key,
    label: label ?? (isMapValue && spec.type === 'object' ? '' : `${scope}.label`),
    ...(help && { help: `${scope}.help` }),
    ...(placeholder && { placeholder: placeholder === true ? `${scope}.placeholder` : placeholder }),
  };
  return { scope, rest, messages };
}

function resolveField(spec: FieldSpec, key: string, defaultScope: string, isMapValue = false): Field {
  switch (spec.type) {
    case 'object': {
      const { scope, rest, messages } = split(spec, key, defaultScope, isMapValue);
      return { ...rest, ...messages, fields: resolveFields(rest.fields, scope) } satisfies ObjectField;
    }
    case 'objectList': {
      const { scope, rest, messages } = split(spec, key, defaultScope, isMapValue);
      return { ...rest, ...messages, itemLabel: `${scope}.itemLabel`, fields: resolveFields(rest.fields, scope) } satisfies ObjectListField;
    }
    case 'map': {
      const { scope, rest, messages } = split(spec, key, defaultScope, isMapValue);
      const { value, keyPlaceholder, ...mapRest } = rest;
      return {
        ...mapRest,
        ...messages,
        keyLabel: `${scope}.keyLabel`,
        ...(keyPlaceholder && { keyPlaceholder: `${scope}.keyPlaceholder` }),
        value: resolveField(value, '', `${scope}.value`, true),
      } satisfies MapField;
    }
    case 'select':
    case 'multiSelect': {
      const { scope, rest, messages } = split(spec, key, defaultScope, isMapValue);
      return { ...rest, ...messages, options: resolveOptions(rest.options, scope) };
    }
    default: {
      const { rest, messages } = split(spec, key, defaultScope, isMapValue);
      return { ...rest, ...messages };
    }
  }
}

/* ====================================================================== Properties */

export interface PropertySpec {
  field: FieldSpec;
  defaultValue: () => ConfigValue;
  minVersion?: string;
  maxVersion?: string;
  conflicts?: string[];
  /** The property has a hint at `properties.<camel(id)>.hint` */
  hint?: boolean;
  docs?: string;
  keepEmpty?: boolean;
  /** Stored in `item.armor` instead of the config (only the armor settings) */
  storage?: 'armor';
}

/** Builds the properties of a group from their specs, keyed by property id (in display order). */
export function properties(group: PropertyGroup, specs: Record<string, PropertySpec>): PropertyDef[] {
  return Object.entries(specs).map(([id, { field: fieldSpec, hint, storage, ...rest }]) => {
    const scope = `properties.${keySegment(id)}`;
    const path = id.split('.');
    const base = {
      ...rest,
      id,
      group,
      label: `${scope}.label`,
      description: `${scope}.description`,
      ...(hint && { hint: `${scope}.hint` }),
      field: resolveField(fieldSpec, path[path.length - 1], `${scope}.field`),
    };
    return storage === 'armor' ? { ...base, storage } : { ...base, storage: 'config', path };
  });
}
