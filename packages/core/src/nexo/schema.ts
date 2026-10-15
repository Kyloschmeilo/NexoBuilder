/**
 * All properties that can be added in the item editor.
 * Source: Nexo documentation (docs.nexomc.com, as of Nexo 1.29 / Minecraft 26.3).
 * The groups live in `schema/`; `schema/build.ts` explains how paths and message keys are derived.
 */
import { APPEARANCE_PROPERTIES } from './schema/appearance';
import { ATTRIBUTE_PROPERTIES } from './schema/attributes';
import type { ConfigPropertyDef, PropertyDef, PropertyGroup } from './schema/build';
import { COMPONENT_PROPERTIES } from './schema/components';
import { GENERAL_PROPERTIES } from './schema/general';
import { MECHANIC_PROPERTIES } from './schema/mechanics';

export type { ArmorPropertyDef, ConfigPropertyDef, PropertyDef, PropertyGroup } from './schema/build';

/** `label` and `description` are message keys in the `schema` namespace. */
export const PROPERTY_GROUPS: Array<{ id: PropertyGroup; label: string; description: string }> = (
  ['general', 'appearance', 'attributes', 'components', 'mechanics'] as const
).map((id) => ({ id, label: `groups.${id}.label`, description: `groups.${id}.description` }));

export const PROPERTIES: PropertyDef[] = [
  ...GENERAL_PROPERTIES,
  ...APPEARANCE_PROPERTIES,
  ...ATTRIBUTE_PROPERTIES,
  ...COMPONENT_PROPERTIES,
  ...MECHANIC_PROPERTIES,
];

/** The properties stored in the item config, i.e. everything except the armor settings */
export const CONFIG_PROPERTIES = PROPERTIES.filter((p): p is ConfigPropertyDef => p.storage === 'config');

export const PROPERTY_BY_ID = new Map(PROPERTIES.map((p) => [p.id, p]));

/** Paths that ResourcepackBuilder sets automatically and that do not count as properties. */
export const MANAGED_TOP_LEVEL_KEYS = ['itemname', 'material'];
