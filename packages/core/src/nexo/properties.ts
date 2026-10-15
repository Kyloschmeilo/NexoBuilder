/**
 * Reading and writing property values of an item. Config properties live at their path in `item.config`;
 * the armor settings live in `item.armor`. The UI edits both the same way through these functions.
 */
import type { ConfigObject, ConfigValue } from '../project/types';
import { toArmorSettings, type ArmorSettings } from './armor';
import { deletePath, getPath, setPath } from './configPath';
import type { PropertyDef } from './schema';

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
