/**
 * Builder for the property schema of a form. Properties are written as field specs without message keys; the
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
import type { ConfigValue } from '../project/types';
import type { ChoiceField, ChoiceOption, Field, MapField, ObjectField, ObjectListField, TypedType } from './fields';
import { keySegment } from '@resourcepackbuilder/utils';
import { labeledOptions, type Option } from './options';

/** Id of a property group (e.g. Nexo's `components`); the form schema lists its groups. */
export type PropertyGroup = string;

interface PropertyBase {
  id: string;
  group: PropertyGroup;
  /** Message key in the form's namespace (the English feature name of the plugin in both languages) */
  label: string;
  /** Message key in the form's namespace */
  description: string;
  field: Field;
  defaultValue: () => ConfigValue;
  minVersion?: string;
  /** Last version in which the property exists */
  maxVersion?: string;
  /** These properties are mutually exclusive */
  conflicts?: string[];
  /** Hint shown above the form – message key in the form's namespace */
  hint?: string;
  /** URL of the property's page (or section) in the plugin's documentation */
  docs?: string;
  /** Write an empty object anyway (mechanic active, even without options) */
  keepEmpty?: boolean;
  /** Shown as a badge next to the label: the property needs a paid edition of the plugin */
  badge?: PropertyBadge;
  /** Sub-group within the property's group that a catalog of properties sorts it into (e.g. `food`) */
  category?: string;
  /** A property most items use, offered first when adding one */
  common?: boolean;
  /** Other words a search for the property matches (e.g. `stack size` for `max_stack_size`) */
  aliases?: string[];
}

/** A badge a property can carry (`premium`: CraftEngine Premium only) */
export type PropertyBadge = 'premium';

/** A property stored in the item config (= the YAML) */
export interface ConfigPropertyDef extends PropertyBase {
  storage: 'config';
  /** Path in the item YAML, e.g. ['Components', 'food'] */
  path: string[];
}

/**
 * A property stored on the item outside the config, never written to the YAML as it is: the armor settings
 * (`item.armor`) and the display name translations (`item.translations`)
 */
export interface ItemFieldPropertyDef extends PropertyBase {
  storage: ItemFieldStorage;
}

/** The item fields a property can be stored in instead of the config */
export type ItemFieldStorage = 'armor' | 'translations';

export type PropertyDef = ConfigPropertyDef | ItemFieldPropertyDef;

/* ====================================================================== Field specs */

/** Field properties the builder derives */
type Derived =
  'key' | 'label' | 'help' | 'placeholder' | 'itemLabel' | 'keyLabel' | 'keyPlaceholder' | 'fields' | 'value' | 'options' | 'choices';

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

/** One form of a choice field: the field that edits it, and how a value of it is recognized and started */
export interface ChoiceSpec extends Omit<ChoiceOption, 'id' | 'label' | 'field'> {
  field: FieldSpec;
}

interface ChoicesSpec {
  /** The forms by id, in display order; each is named at `<scope>.choices.<camel(id)>.label` */
  choices: Record<string, ChoiceSpec>;
}

interface OptionsSpec {
  /** Option lists, or plain values that get labels at `<scope>.options.<camel(value)>.label` */
  options: Option[] | string[];
}

type SpecOf<F extends Field> = Omit<F, Derived> &
  SpecMessages &
  (F extends { fields: Field[] } ? { fields: FieldSpecs } : unknown) &
  (F extends { value: Field } ? MapValueSpec : unknown) &
  (F extends { options: Option[] } ? OptionsSpec : unknown) &
  (F extends { choices: ChoiceOption[] } ? ChoicesSpec : unknown);

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
  select: (options: Option[] | string[], rest: SpecOptions<'select', 'options'> = {}): SpecFor<'select'> => ({
    type: 'select',
    options,
    ...rest,
  }),
  multiSelect: (options: Option[] | string[], rest: SpecOptions<'multiSelect', 'options'> = {}): SpecFor<'multiSelect'> => ({
    type: 'multiSelect',
    options,
    ...rest,
  }),
  object: (fields: FieldSpecs, rest: SpecOptions<'object', 'fields'> = {}): SpecFor<'object'> => ({ type: 'object', fields, ...rest }),
  objectList: (fields: FieldSpecs, rest: SpecOptions<'objectList', 'fields'> = {}): SpecFor<'objectList'> => ({
    type: 'objectList',
    fields,
    ...rest,
  }),
  map: (value: FieldSpec, rest: SpecOptions<'map', 'value'> = {}): SpecFor<'map'> => ({ type: 'map', value, ...rest }),
  typedList: (
    catalog: string,
    types: () => readonly TypedType[],
    rest: SpecOptions<'typedList', 'catalog' | 'types'> = {},
  ): SpecFor<'typedList'> => ({ type: 'typedList', catalog, types, ...rest }),
  numberProvider: (
    catalog: string,
    types: () => readonly TypedType[],
    rest: SpecOptions<'numberProvider', 'catalog' | 'types'> = {},
  ): SpecFor<'numberProvider'> => ({ type: 'numberProvider', catalog, types, ...rest }),
  choice: (choices: Record<string, ChoiceSpec>, rest: SpecOptions<'choice', 'choices'> = {}): SpecFor<'choice'> => ({
    type: 'choice',
    choices,
    ...rest,
  }),
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

/** Resolves child field specs at a message scope (their keys at `<scope>.fields.<camel(key)>`). */
export function resolveFields(specs: FieldSpecs, scope: string): Field[] {
  return Object.entries(specs).map(([key, spec]) =>
    resolveField(spec, key, `${scope}.fields.${key === '*' ? 'entries' : keySegment(key)}`),
  );
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
    case 'choice': {
      const { scope, rest, messages } = split(spec, key, defaultScope, isMapValue);
      const choices = Object.entries(rest.choices).map(([id, { field: choiceSpec, ...choice }]): ChoiceOption => {
        const choiceScope = `${scope}.choices.${keySegment(id)}`;
        // An object form has no label of its own (the choice names it)
        return { id, label: `${choiceScope}.label`, field: resolveField(choiceSpec, '', `${choiceScope}.field`, true), ...choice };
      });
      return { ...rest, ...messages, choices } satisfies ChoiceField;
    }
    case 'typedList':
    case 'numberProvider': {
      const { rest, messages } = split(spec, key, defaultScope, isMapValue);
      return { ...rest, ...messages };
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
  badge?: PropertyBadge;
  category?: string;
  common?: boolean;
  aliases?: string[];
  /** Stored in an item field instead of the config: `item.armor` or `item.translations` */
  storage?: ItemFieldStorage;
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
    return storage ? { ...base, storage } : { ...base, storage: 'config', path };
  });
}
