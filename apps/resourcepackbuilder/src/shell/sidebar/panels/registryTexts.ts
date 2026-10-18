/**
 * The message keys of the registry groups (`media.registry.groups.<id>`): their title, the "New …" action, the empty
 * state and the label of an entry without a name. Map groups also have the label of their key.
 */

/** The ids of every registry group, media and CraftEngine. */
export const REGISTRY_GROUP_IDS = [
  'glyphs',
  'sounds',
  'paintings',
  'dialogs',
  'lootSources',
  'templates',
  'globalVariables',
  'definitions',
  'operations',
  'equipmentSets',
  'damageRules',
  'lang',
  'server',
  'categories',
  'configuredFeatures',
  'placedFeatures',
  'atlases',
  'configFactories',
  'scripts',
] as const;

export type RegistryGroupId = (typeof REGISTRY_GROUP_IDS)[number];

/** The texts every group has. */
export const REGISTRY_GROUP_TEXTS = ['title', 'add', 'empty', 'untitled'] as const;

/** The groups whose entries are map keys and that ask for a name when adding. */
export const REGISTRY_MAP_GROUP_IDS = ['globalVariables', 'lang', 'server'] as const satisfies readonly RegistryGroupId[];

export type RegistryMapGroupId = (typeof REGISTRY_MAP_GROUP_IDS)[number];

/** `id` as a group id; null for an id without texts of its own (a group added without them uses the generic texts). */
export function registryGroupId(id: string): RegistryGroupId | null {
  return (REGISTRY_GROUP_IDS as readonly string[]).includes(id) ? (id as RegistryGroupId) : null;
}
