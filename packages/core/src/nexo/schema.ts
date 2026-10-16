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
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject } from '../project/types';

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

const PROPERTY_PATHS = new Set(CONFIG_PROPERTIES.map((p) => p.path.join('.')));
/** Objects that contain properties (Components, Mechanics, Pack …) */
const SECTION_PATHS = new Set(CONFIG_PROPERTIES.flatMap((p) => p.path.slice(1).map((_, i) => p.path.slice(0, i + 1).join('.'))));

/**
 * Paths of the config values that belong to no property (e.g. from imported configs or new Nexo
 * keys). Sections that contain properties are looked into, so `Components.some_new_component` is
 * reported, not `Components`; anything else is reported as a whole. Managed keys (material,
 * itemname) count as unknown here – callers that treat them separately filter them out.
 */
export function unknownConfigPaths(config: ConfigObject): string[][] {
  const result: string[][] = [];
  const visit = (value: Record<string, unknown>, parent: string[]) => {
    for (const [key, entry] of Object.entries(value)) {
      const path = [...parent, key];
      const id = path.join('.');
      if (PROPERTY_PATHS.has(id)) continue;
      if (SECTION_PATHS.has(id) && isPlainObject(entry)) visit(entry, path);
      else result.push(path);
    }
  };
  visit(config, []);
  return result;
}
