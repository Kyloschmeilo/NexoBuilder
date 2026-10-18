/**
 * The shape of the CraftEngine logic catalogs (conditions, functions, number providers, event triggers, loot sources)
 * and the builder that turns their specs into the typed-list types of the form DSL, each linked to its wiki section.
 *
 * Messages (in `ceSchema`): `logic.<catalog>.<camel(type)>.label` (the type itself in both languages) and `.help`
 * (a short description); the fields of a type below `.fields.<camel(key)>` like any field spec. Field titles show the
 * CraftEngine key as it is written in the YAML.
 */
import { keySegment } from '@resourcepackbuilder/utils';
import { type FieldSpecs, resolveFields } from '../../form/build';
import type { Field, TypedType } from '../../form/fields';
import { fieldMessageKeys } from '../../form/messageKeys';
import { ceLogicDocs } from '../form/schema/docs';

export type LogicCatalogName =
  | 'conditions'
  | 'functions'
  | 'numbers'
  | 'triggers'
  | 'lootSources'
  | 'lootEntries'
  | 'lootFunctions'
  | 'attributeBases'
  | 'attributeSyncValues'
  | 'damageFormulas'
  | 'damageEffects';

/** The objects that fire events (and so have event triggers) */
export type LogicObjectKind = 'item' | 'block' | 'furniture';

export interface LogicTypeSpec {
  type: string;
  /** The keys of an entry besides `type`, in display order */
  fields?: FieldSpecs;
  /** Triggers: the objects that fire it (none: registered, but nothing fires it) */
  objectKinds?: LogicObjectKind[];
  /** Other names the plugin accepts for this type */
  aliases?: string[];
  /** Only CraftEngine Premium reads this type */
  premium?: boolean;
  /** Wiki link of the type, when it is not the type's section on its catalog's page (ceLogicDocs) */
  docs?: string;
  /** Sub-group of the catalog the type is listed under */
  category?: string;
}

export interface LogicType extends TypedType {
  objectKinds?: LogicObjectKind[];
  aliases?: string[];
}

/** Shows each field (and the fields nested in it) under its YAML key. */
export function withKeyNames(fields: Field[]): Field[] {
  return fields.map((f) => {
    const named = f.key && f.key !== '*' ? { ...f, name: f.key } : f;
    if (named.type === 'object' || named.type === 'objectList') return { ...named, fields: withKeyNames(named.fields) };
    if (named.type === 'choice') {
      return { ...named, choices: named.choices.map((choice) => ({ ...choice, field: withKeyNames([choice.field])[0] })) };
    }
    return named;
  });
}

/** Resolves the specs of a catalog into its types, with their message keys and their wiki links. */
export function logicCatalog(catalog: LogicCatalogName, specs: LogicTypeSpec[]): LogicType[] {
  return specs.map(({ type, fields = {}, docs = ceLogicDocs(catalog, type), ...rest }) => {
    const scope = `logic.${catalog}.${keySegment(type)}`;
    return { type, label: `${scope}.label`, help: `${scope}.help`, fields: withKeyNames(resolveFields(fields, scope)), docs, ...rest };
  });
}

/** All message keys of a catalog's types and their fields. */
export function logicMessageKeys(types: readonly LogicType[]): string[] {
  return types.flatMap((t) => [t.label, ...(t.help ? [t.help] : []), ...t.fields.flatMap(fieldMessageKeys)]);
}
