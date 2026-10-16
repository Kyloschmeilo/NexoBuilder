/**
 * All properties that can be added in the item editor of a CraftEngine project.
 * Source: CraftEngine wiki (momirealms.net/craft-engine-wiki), checked against the plugin source and the jar's
 * default assets. The groups live in `schema/`; `form/build.ts` explains how paths and message keys are derived.
 */
import type { PropertyDef } from '../../form/build';
import type { FormSchema } from '../../form/types';
import { CE_DATA_PROPERTIES } from './schema/data';
import { CE_GENERAL_PROPERTIES } from './schema/general';
import { CE_SETTINGS_PROPERTIES } from './schema/settings';

export type CraftEnginePropertyGroup = 'general' | 'data' | 'settings';

/** `label` and `description` are message keys in the `ceSchema` namespace. */
export const CE_PROPERTY_GROUPS: Array<{ id: CraftEnginePropertyGroup; label: string; description: string }> = (
  ['general', 'data', 'settings'] as const
).map((id) => ({ id, label: `groups.${id}.label`, description: `groups.${id}.description` }));

export const CE_PROPERTIES: PropertyDef[] = [...CE_GENERAL_PROPERTIES, ...CE_DATA_PROPERTIES, ...CE_SETTINGS_PROPERTIES];

/** Paths that ResourcepackBuilder sets automatically: the material and the display name. */
export const CE_MANAGED_PATHS = ['material', 'data.item_name'];

/** The CraftEngine item editor. The group `general` is shown on the app's General tab. */
export const CRAFT_ENGINE_FORM: FormSchema = {
  target: 'craftengine',
  groups: CE_PROPERTY_GROUPS,
  properties: CE_PROPERTIES,
  messages: 'ceSchema',
  managedPaths: CE_MANAGED_PATHS,
  tabs: (['data', 'settings'] as const).map((group) => ({ id: group, group })),
};
