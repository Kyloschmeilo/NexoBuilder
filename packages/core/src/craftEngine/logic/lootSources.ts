/**
 * The loot source types (`LootSources`, checked against the plugin's registry; 12). `fishing` and `piglin_barter` take
 * no target. The plugin also reads the old names `block`, `entity` and `shear_block`. `loot` stays YAML until the loot
 * table editor exists. No type is Premium only.
 */
import { field, type FieldSpecs } from '../../form/build';
import { logicCatalog, type LogicTypeSpec } from './catalog';
import { gate } from './shared';

/** A loot source type; `targeted`: it applies to the ids in `target` (all when unset) */
function source(type: string, targeted = true): LogicTypeSpec {
  const fields: FieldSpecs = {
    ...(targeted && {
      target: field.stringList({ format: 'resource', singleAsString: true, scope: 'logic.shared.lootTarget', help: true }),
    }),
    overwrite: field.stringList({
      suggestions: [{ value: 'items' }, { value: 'experience' }, { value: 'all' }, { value: 'none' }],
      singleAsString: true,
      scope: 'logic.shared.overwrite',
      help: true,
    }),
    conditions: gate(),
    loot: field.yaml({ scope: 'logic.shared.loot', help: true }),
  };
  return { type, fields };
}

export const CE_LOOT_SOURCES = logicCatalog('lootSources', [
  source('block_break'),
  source('entity_death'),
  source('fishing', false),
  source('piglin_barter', false),
  source('container'),
  source('archaeology'),
  source('entity_drop'),
  source('harvest'),
  source('block_shear'),
  source('entity_shear'),
  source('vault'),
  source('advancement'),
]);
