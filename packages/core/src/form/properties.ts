/**
 * Reading and writing property values of an item. Config properties live at their path in `item.config`;
 * the armor settings live in `item.armor`. The UI edits both the same way through these functions.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject, ConfigValue } from '../project/types';
import { toArmorSettings, type ArmorSettings } from '../project/armor';
import { deletePath, getPath, setPath } from '../project/config';
import type { PropertyDef, PropertyGroup } from './build';
import type { FormSchema } from './types';

/** What holds property values: an item, or a clipboard copy of one */
export interface PropertyOwner {
  config: ConfigObject;
  armor?: ArmorSettings;
}

/* ====================================================================== Schema lookups */

interface SchemaIndex {
  byId: Map<string, PropertyDef>;
  /** YAML paths of the config properties ("Components.food") */
  propertyPaths: Set<string>;
  /** Objects that contain properties (Components, Mechanics, Pack …) */
  sectionPaths: Set<string>;
}

/** Lookups per schema, built on first use (schemas are constant values). */
const INDEXES = new WeakMap<FormSchema, SchemaIndex>();

function schemaIndex(schema: FormSchema): SchemaIndex {
  let index = INDEXES.get(schema);
  if (!index) {
    const paths = schema.properties.flatMap((p) => (p.storage === 'config' ? [p.path] : []));
    index = {
      byId: new Map(schema.properties.map((p) => [p.id, p])),
      propertyPaths: new Set(paths.map((path) => path.join('.'))),
      sectionPaths: new Set(paths.flatMap((path) => path.slice(1).map((_, i) => path.slice(0, i + 1).join('.')))),
    };
    INDEXES.set(schema, index);
  }
  return index;
}

export function propertyById(schema: FormSchema, id: string): PropertyDef | undefined {
  return schemaIndex(schema).byId.get(id);
}

/**
 * Paths of the config values that belong to no property (e.g. from imported configs or new plugin
 * keys). Sections that contain properties are looked into, so `Components.some_new_component` is
 * reported, not `Components`; anything else is reported as a whole. Managed keys (material,
 * itemname) count as unknown here – callers that treat them separately filter them out.
 */
export function unknownConfigPaths(schema: FormSchema, config: ConfigObject): string[][] {
  const { propertyPaths, sectionPaths } = schemaIndex(schema);
  const result: string[][] = [];
  const visit = (value: Record<string, unknown>, parent: string[]) => {
    for (const [key, entry] of Object.entries(value)) {
      const path = [...parent, key];
      const id = path.join('.');
      if (propertyPaths.has(id)) continue;
      if (sectionPaths.has(id) && isPlainObject(entry)) visit(entry, path);
      else result.push(path);
    }
  };
  visit(config, []);
  return result;
}

/* ====================================================================== Values */

export function getPropertyValue(owner: PropertyOwner, def: PropertyDef): ConfigValue | undefined {
  return def.storage === 'armor' ? owner.armor : getPath(owner.config, def.path);
}

export function isPropertyActive(owner: PropertyOwner, def: PropertyDef): boolean {
  return getPropertyValue(owner, def) !== undefined;
}

/** The properties of `group` the owner uses, in schema order. */
export function activeProperties(schema: FormSchema, owner: PropertyOwner, group: PropertyGroup): PropertyDef[] {
  return schema.properties.filter((def) => def.group === group && isPropertyActive(owner, def));
}

/** The properties of `group` the owner could add. */
export function availableProperties(schema: FormSchema, owner: PropertyOwner, group: PropertyGroup): PropertyDef[] {
  return schema.properties.filter((def) => def.group === group && !isPropertyActive(owner, def));
}

/** An active property that cannot be combined with `def`, if any. */
export function propertyConflict(schema: FormSchema, owner: PropertyOwner, def: PropertyDef): PropertyDef | undefined {
  return def.conflicts
    ?.map((id) => propertyById(schema, id))
    .find((other): other is PropertyDef => !!other && isPropertyActive(owner, other));
}

/** Where the property is written in the item YAML ("Mechanics.furniture"), or null for settings of ResourcepackBuilder. */
export function propertyYamlPath(def: PropertyDef): string | null {
  return def.storage === 'config' ? def.path.join('.') : null;
}

/** The value a property keeps when its editor is cleared: the property stays on the item until it is removed. */
export function emptyPropertyValue(def: PropertyDef): ConfigValue {
  switch (def.field.type) {
    case 'object':
    case 'map':
    case 'presence':
      return {};
    case 'objectList':
    case 'stringList':
    case 'multiSelect':
      return [];
    default:
      return null;
  }
}

/** Sets a property value (mutates `owner`); `undefined` removes the property. */
export function setPropertyValue(owner: PropertyOwner, def: PropertyDef, value: ConfigValue | undefined): void {
  if (def.storage === 'config') {
    if (value === undefined) deletePath(owner.config, def.path);
    else setPath(owner.config, def.path, value);
  } else if (value === undefined) {
    delete owner.armor;
  } else {
    owner.armor = toArmorSettings(value);
  }
}
