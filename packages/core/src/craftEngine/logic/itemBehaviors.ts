/**
 * The item behaviors an item can have besides the one that places its block or furniture (`BukkitItemBehaviors`,
 * checked against the plugin's registry). The placement behaviors (`block_item`, `furniture_item` …) are no entries of
 * this list: the item's `behavior` property picks one (itemBehaviors.ts), and the export lists it first.
 *
 * `range_mining_item` reads `condition(s)` and `range` (a list of `x,y,z` offsets), `compostable_item` reads `chance`
 * (default 0.55 in the plugin, 0.5 on the wiki) and `flint_and_steel_item` (no wiki page) has no keys.
 */
import { field } from '../../form/build';
import { CE_DOCS, ceItemBehaviorDocs } from '../form/schema/docs';
import { logicCatalog } from './catalog';
import { conditionList } from './shared';

export const CE_ITEM_BEHAVIORS = logicCatalog('itemBehaviors', [
  {
    type: 'range_mining_item',
    fields: {
      conditions: conditionList(),
      range: field.stringList({ format: 'vector', placeholder: true, help: true }),
    },
    docs: ceItemBehaviorDocs('range_mining_item'),
    category: 'tools',
  },
  {
    type: 'compostable_item',
    fields: { chance: field.number({ min: 0, max: 1, step: 0.05, help: true }) },
    docs: ceItemBehaviorDocs('compostable_item'),
    category: 'farming',
  },
  // Lights fires as flint and steel does; registered in the plugin, not documented on the wiki
  { type: 'flint_and_steel_item', docs: CE_DOCS.itemBehaviors, category: 'tools' },
]);
