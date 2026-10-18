/**
 * The block's behaviors: the main behavior (`block.behavior`, set up by a preset of the Block section together with
 * the states it needs), further behaviors (`block.behaviors`), both typed by the block behavior catalog
 * (logic/blockBehaviors.ts), and the arguments of the state templates the presets use (`block.states.arguments.*`).
 * The Block section shows only the arguments of the block's preset (blockBehaviors.ts lists them).
 */
import { plainOptions } from '../../../form/options';
import { field, properties, type PropertySpec } from '../../../form/build';
import { CE_BASE_BLOCKS, CE_DEFAULT_BASE_BLOCKS, CE_DEFAULT_LEAVES_TINTABLE } from '../../blockBehaviors';
import { CE_BLOCK_BEHAVIORS } from '../../logic/blockBehaviors';
import { CE_DOCS, ceBlockBehaviorDocs } from './docs';

const baseBlock = (key: keyof typeof CE_BASE_BLOCKS, docs: string): PropertySpec => ({
  field: field.select(plainOptions(CE_BASE_BLOCKS[key])),
  defaultValue: () => CE_DEFAULT_BASE_BLOCKS[key],
  hint: true,
  docs,
});

/** An item whose model a template shows through an entity renderer (fence posts and sides, buttons) */
const itemArgument = (docs: string, hint = false): PropertySpec => ({
  field: field.text({ format: 'resource', placeholder: true }),
  defaultValue: () => '',
  ...(hint && { hint }),
  docs,
});

/** A typed list of block behaviors (a single behavior may stand without a list) */
const behaviorList = () => field.typedList('blockBehaviors', () => CE_BLOCK_BEHAVIORS);

const BEHAVIOR: Record<string, PropertySpec> = {
  'block.states.arguments.slab_base_block': baseBlock('slab_base_block', ceBlockBehaviorDocs('slab_block')),
  'block.states.arguments.stairs_base_block': baseBlock('stairs_base_block', ceBlockBehaviorDocs('stairs_block')),
  'block.states.arguments.door_base_block': baseBlock('door_base_block', ceBlockBehaviorDocs('door_block')),
  'block.states.arguments.trapdoor_base_block': baseBlock('trapdoor_base_block', ceBlockBehaviorDocs('trapdoor_block')),
  'block.states.arguments.fence_gate_base_block': baseBlock('fence_gate_base_block', ceBlockBehaviorDocs('fence_gate_block')),
  'block.states.arguments.fence_base_block': baseBlock('fence_base_block', ceBlockBehaviorDocs('fence_block')),
  'block.states.arguments.fence_post_item': itemArgument(ceBlockBehaviorDocs('fence_block'), true),
  'block.states.arguments.fence_side_item': itemArgument(ceBlockBehaviorDocs('fence_block')),
  'block.states.arguments.button_base_block': baseBlock('button_base_block', ceBlockBehaviorDocs('button_block')),
  'block.states.arguments.button_not_pressed_item': itemArgument(ceBlockBehaviorDocs('button_block'), true),
  'block.states.arguments.button_pressed_item': itemArgument(ceBlockBehaviorDocs('button_block')),
  'block.states.arguments.leaves_tintable': {
    field: field.boolean({ defaultHint: CE_DEFAULT_LEAVES_TINTABLE }),
    defaultValue: () => CE_DEFAULT_LEAVES_TINTABLE,
    docs: ceBlockBehaviorDocs('leaves_block'),
  },
  'block.states.arguments.leaves_max_distance': {
    field: field.number({ integer: true, min: 1, max: 32 }),
    defaultValue: () => 7,
    docs: ceBlockBehaviorDocs('leaves_block'),
  },
  // Edited in the Block section by the type's own fields (its preset fixes the type)
  'block.behavior': { field: behaviorList(), defaultValue: () => ({ type: 'falling_block' }), docs: CE_DOCS.blockBehaviors },
  'block.behaviors': {
    field: behaviorList(),
    defaultValue: () => [{ type: 'falling_block' }],
    hint: true,
    docs: CE_DOCS.blockBehaviors,
    common: true,
    aliases: ['behaviour', 'composite'],
  },
};

export const CE_BLOCK_BEHAVIOR_PROPERTIES = properties('blockBehavior', BEHAVIOR);
