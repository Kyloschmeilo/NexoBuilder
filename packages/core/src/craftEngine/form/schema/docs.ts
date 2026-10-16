import type { PropertySpec } from '../../../form/build';

const WIKI = 'https://momirealms.net/craft-engine-wiki/configuration/item';

/** The CraftEngine wiki pages of the item sections */
export const CE_DOCS = { data: `${WIKI}/data`, settings: `${WIKI}/settings` };

/** Links every property of a group to its wiki page. */
export const withDocs = (docs: string, specs: Record<string, PropertySpec>): Record<string, PropertySpec> =>
  Object.fromEntries(Object.entries(specs).map(([id, spec]) => [id, { docs, ...spec }]));
