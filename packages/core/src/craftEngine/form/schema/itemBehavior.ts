/**
 * The item's behaviors (Behaviors tab): how the item places its block or furniture (`behavior`) and the behaviors it
 * has besides (`behaviors`). The export fills in the item's own block or furniture and writes both as CraftEngine
 * reads them (itemBehaviors.ts).
 */
import { field, properties, whenType } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { plainOptions } from '../../../form/options';
import { CE_BLOCK_PLACEMENTS, CE_FURNITURE_PLACEMENTS, CE_PLACEMENT_BEHAVIORS, CE_PLACEMENT_LIQUIDS } from '../../itemBehaviors';
import { CE_ITEM_BEHAVIORS } from '../../logic/itemBehaviors';
import { CE_DOCS, ceItemBehaviorDocs } from './docs';

const forBlocks = () => whenType(...CE_BLOCK_PLACEMENTS);
const forFurniture = () => whenType(...CE_FURNITURE_PLACEMENTS);

export const CE_ITEM_BEHAVIOR_PROPERTIES = properties(
  'itemBehavior',
  withDocs(CE_DOCS.itemBehaviors, {
    behavior: {
      field: field.object({
        type: field.select(plainOptions([...CE_PLACEMENT_BEHAVIORS]), { help: true }),
        block: field.text({ format: 'resource', placeholder: true, help: true, ...forBlocks() }),
        furniture: field.text({ format: 'resource', placeholder: true, help: true, ...forFurniture() }),
        y_offset: field.number({
          integer: true,
          help: true,
          ...whenType('liquid_collision_block_item'),
          docs: ceItemBehaviorDocs('liquid_collision_block_item'),
        }),
        ignore_placer: field.boolean({ defaultHint: false, ...forFurniture() }),
        ignore_entities: field.boolean({ defaultHint: false, ...forFurniture() }),
        against_blocks: field.stringList({ placeholder: true, help: true, ...forFurniture() }),
        against_block_tags: field.stringList({ placeholder: true, help: true, ...forFurniture() }),
        blacklist: field.boolean({ defaultHint: true, help: true, ...forFurniture() }),
        source_only: field.boolean({ defaultHint: true, ...whenType('liquid_collision_furniture_item') }),
        liquid_type: field.multiSelect(plainOptions([...CE_PLACEMENT_LIQUIDS]), { ...whenType('liquid_collision_furniture_item') }),
      }),
      defaultValue: () => ({ type: 'block_item' }),
      hint: true,
      common: true,
      aliases: ['placement', 'place', 'block_item', 'furniture_item'],
    },
    behaviors: {
      field: field.typedList('itemBehaviors', () => CE_ITEM_BEHAVIORS),
      defaultValue: () => [{ type: 'compostable_item', chance: 0.5 }],
      aliases: ['range mining', 'compost', 'flint and steel'],
    },
  }),
);
