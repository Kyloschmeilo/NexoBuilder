/**
 * The loot table catalogs: the entry types of a pool (`LootEntryContainers`, checked against the plugin's registry;
 * 8, `if_else` a second name of `alternatives`) and the loot functions (`LootFunctions`; 6). A loot table holds pools
 * (`rolls`, `bonus_rolls`, `conditions`, `entries`, `functions`) and its own `functions`; its conditions are the
 * common ones. `apply_bonus` takes a formula (`ore_drops` or `binomial_with_bonus_count`). No type is Premium only.
 */
import { field, type FieldSpecs, whenType } from '../../form/build';
import { plainOptions } from '../../form/options';
import { categorized, logicCatalog, type LogicTypeSpec } from './catalog';
import { functionList, gate, lootEntryList, lootFunctionList, numberProvider, resource } from './shared';

/** How likely an entry is picked among the others of its pool (`weight`, default 1) and how luck changes that */
const picking = (): FieldSpecs => ({
  weight: field.number({ integer: true, min: 0, help: true, scope: 'logic.shared.weight' }),
  quality: field.number({ integer: true, help: true, scope: 'logic.shared.quality' }),
});

/** An entry type: its own keys, then (for the single entries) weight and quality, its conditions and functions */
function entry(type: string, fields: FieldSpecs, { single = true, functions = true } = {}): LogicTypeSpec {
  return {
    type,
    fields: { ...fields, ...(single && picking()), conditions: gate(), ...(functions && { functions: lootFunctionList() }) },
  };
}

const item = () => resource();
const children = () => ({ children: lootEntryList() });

/** The catalog categories (`logic.categories.lootEntries.<category>`) and the entry types listed under each */
const ENTRY_CATEGORIES = {
  drops: ['item', 'furniture_item', 'exp', 'loot_table', 'empty'],
  flow: ['alternatives', 'if_else', 'function'],
};

export const CE_LOOT_ENTRIES = logicCatalog(
  'lootEntries',
  categorized(
    [
      entry('item', { item: item() }),
      entry('furniture_item', { item: { ...item(), help: true } }),
      entry('exp', { count: numberProvider() }, { single: false, functions: false }),
      entry('empty', {}, { functions: false }),
      entry('function', { run: functionList() }),
      entry('loot_table', { id: resource() }),
      entry('alternatives', children(), { single: false, functions: false }),
      entry('if_else', children(), { single: false, functions: false }),
    ],
    ENTRY_CATEGORIES,
  ),
);

/** A loot function type: its own keys, then `conditions` */
const lootFn = (type: string, fields: FieldSpecs = {}): LogicTypeSpec => ({ type, fields: { ...fields, conditions: gate() } });

const FORMULAS = ['ore_drops', 'binomial_with_bonus_count'];

/** The catalog categories (`logic.categories.lootFunctions.<category>`) and the functions listed under each */
const FUNCTION_CATEGORIES = {
  count: ['set_count', 'apply_bonus', 'limit_count', 'explosion_decay'],
  data: ['apply_data', 'drop_exp'],
};

export const CE_LOOT_FUNCTIONS = logicCatalog(
  'lootFunctions',
  categorized(
    [
      lootFn('set_count', { count: numberProvider(), add: field.boolean({ defaultHint: false, help: true, scope: 'logic.shared.add' }) }),
      lootFn('apply_bonus', {
        enchantment: resource(),
        formula: field.object(
          {
            type: field.select(plainOptions(FORMULAS), { help: true }),
            extra: field.number({ integer: true, min: 0, ...whenType('binomial_with_bonus_count') }),
            probability: field.number({ min: 0, max: 1, step: 0.05, ...whenType('binomial_with_bonus_count') }),
          },
          { help: true },
        ),
      }),
      lootFn('explosion_decay'),
      lootFn('limit_count', { min: numberProvider(), max: numberProvider() }),
      lootFn('drop_exp', { count: numberProvider() }),
      lootFn('apply_data', { data: field.yaml({ help: true }) }),
    ],
    FUNCTION_CATEGORIES,
  ),
);
