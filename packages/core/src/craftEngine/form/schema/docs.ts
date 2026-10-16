import type { PropertySpec } from '../../../form/build';

const WIKI = 'https://momirealms.net/craft-engine-wiki';

/** The CraftEngine wiki pages of the item and block sections */
export const CE_DOCS = {
  data: `${WIKI}/configuration/item/data`,
  settings: `${WIKI}/configuration/item/settings`,
  blockSettings: `${WIKI}/configuration/block/settings`,
  blockStates: `${WIKI}/configuration/block/states`,
  blockBehaviors: `${WIKI}/configuration/block/behaviors`,
  loot: `${WIKI}/reference/loot_table`,
};

/** Links every property of a group to its wiki page. */
export const withDocs = (docs: string, specs: Record<string, PropertySpec>): Record<string, PropertySpec> =>
  Object.fromEntries(Object.entries(specs).map(([id, spec]) => [id, { docs, ...spec }]));
