import { properties } from '../../../form/build';
import { withKeyNames } from '../../logic/catalog';
import { lootTable } from '../../logic/shared';
import { CE_FURNITURE_LOOT_TEMPLATE } from '../../furniture';
import { CE_LOOT_PROPERTY_IDS } from '../../loot';
import { CE_DOCS } from './docs';

/**
 * What the block and the furniture drop (`loot` at the root of each definition, read with ConfigValue.getAsLoot): a
 * loot template with its arguments, a loot table or the id of one. The Loot tab shows the block's only on a block and
 * the furniture's only on furniture (lootPropertyIds). Field titles show the CraftEngine keys, as in the logic catalog.
 */
export const CE_LOOT_PROPERTIES = properties('loot', {
  [CE_LOOT_PROPERTY_IDS.block]: { field: lootTable(), defaultValue: () => ({ template: 'default:loot_table/self' }), docs: CE_DOCS.loot },
  [CE_LOOT_PROPERTY_IDS.furniture]: {
    field: lootTable(),
    defaultValue: () => ({ template: CE_FURNITURE_LOOT_TEMPLATE }),
    docs: CE_DOCS.loot,
  },
}).map((def) => ({ ...def, field: withKeyNames([def.field])[0] }));
