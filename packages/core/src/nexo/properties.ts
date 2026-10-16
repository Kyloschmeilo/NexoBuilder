/**
 * Reading and writing property values of an item. Config properties live at their path in `item.config`;
 * the armor settings live in `item.armor`. The UI edits both the same way through these functions.
 */
import type { ConfigObject, ConfigValue } from '../project/types';
import { toArmorSettings, type ArmorSettings } from './armor';
import { deletePath, getPath, setPath } from './configPath';
import { PROPERTIES, PROPERTY_BY_ID, type PropertyDef, type PropertyGroup } from './schema';

/** What holds property values: an item, or a clipboard copy of one */
export interface PropertyOwner {
  config: ConfigObject;
  armor?: ArmorSettings;
}

export function getPropertyValue(owner: PropertyOwner, def: PropertyDef): ConfigValue | undefined {
  return def.storage === 'armor' ? owner.armor : getPath(owner.config, def.path);
}

export function isPropertyActive(owner: PropertyOwner, def: PropertyDef): boolean {
  return getPropertyValue(owner, def) !== undefined;
}

/** The properties of `group` the owner uses, in schema order. */
export function activeProperties(owner: PropertyOwner, group: PropertyGroup): PropertyDef[] {
  return PROPERTIES.filter((def) => def.group === group && isPropertyActive(owner, def));
}

/** The properties of `group` the owner could add. */
export function availableProperties(owner: PropertyOwner, group: PropertyGroup): PropertyDef[] {
  return PROPERTIES.filter((def) => def.group === group && !isPropertyActive(owner, def));
}

/** An active property that cannot be combined with `def`, if any. */
export function propertyConflict(owner: PropertyOwner, def: PropertyDef): PropertyDef | undefined {
  return def.conflicts
    ?.map((id) => PROPERTY_BY_ID.get(id))
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
