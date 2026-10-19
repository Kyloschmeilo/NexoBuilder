/**
 * All properties that can be added in the item editor.
 * Source: Nexo documentation (docs.nexomc.com, as of Nexo 1.29 / Minecraft 26.3).
 * The groups live in `schema/`; `form/build.ts` explains how paths and message keys are derived.
 */
import { APPEARANCE_PROPERTIES } from './schema/appearance';
import { ATTRIBUTE_PROPERTIES } from './schema/attributes';
import { NEXO_CATALOG } from './schema/catalog';
import type { PropertyDef } from '../../form/build';
import { withCatalog } from '../../form/catalogMeta';
import type { FormSchema } from '../../form/types';
import { COMPONENT_PROPERTIES } from './schema/components';
import { GENERAL_PROPERTIES } from './schema/general';
import { MECHANIC_PROPERTIES } from './schema/mechanics';

export type NexoPropertyGroup = 'general' | 'appearance' | 'attributes' | 'components' | 'mechanics';

/** `label` and `description` are message keys in the `schema` namespace. */
export const PROPERTY_GROUPS: Array<{ id: NexoPropertyGroup; label: string; description: string }> = (
  ['general', 'appearance', 'attributes', 'components', 'mechanics'] as const
).map((id) => ({ id, label: `groups.${id}.label`, description: `groups.${id}.description` }));

/** Every property, with its catalog category, common flag and aliases from `schema/catalog.ts`. */
export const PROPERTIES: PropertyDef[] = withCatalog(
  [...GENERAL_PROPERTIES, ...APPEARANCE_PROPERTIES, ...ATTRIBUTE_PROPERTIES, ...COMPONENT_PROPERTIES, ...MECHANIC_PROPERTIES],
  NEXO_CATALOG,
);

/** Paths that ResourcepackBuilder sets automatically and that do not count as properties. */
export const MANAGED_TOP_LEVEL_KEYS = ['itemname', 'material'];

/** The Nexo item editor. The groups `general` and `appearance` are shown on the app's General and Model tabs. */
export const NEXO_FORM: FormSchema = {
  target: 'nexo',
  groups: PROPERTY_GROUPS,
  properties: PROPERTIES,
  messages: 'schema',
  managedPaths: MANAGED_TOP_LEVEL_KEYS,
  tabs: (['attributes', 'components', 'mechanics'] as const).map((group) => ({ id: group, group })),
};
