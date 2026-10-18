import { plainOptions } from '../../../form/options';
import { field, properties, type PropertySpec } from '../../../form/build';
import { CE_BASE_BLOCKS, CE_DEFAULT_BASE_BLOCKS, CE_DEFAULT_LEAVES_TINTABLE } from '../../blockBehaviors';
import { CE_BLOCK_SOUNDS } from '../options';
import { CE_DOCS, ceBlockBehaviorDocs } from './docs';

const lightLevel = () => field.number({ integer: true, min: 0, max: 15 });
const sound = () => field.text({ suggestions: CE_BLOCK_SOUNDS, placeholder: true });
const baseBlock = (key: keyof typeof CE_BASE_BLOCKS, docs: string): PropertySpec => ({
  field: field.select(plainOptions(CE_BASE_BLOCKS[key])),
  defaultValue: () => CE_DEFAULT_BASE_BLOCKS[key],
  hint: true,
  docs,
});

/**
 * The keys of the behaviors the editor has a form for (`block.behavior.*`, checked against the plugin's behavior
 * factories) and the arguments of the state templates they use (`block.states.arguments.*`). The Block section shows
 * only those of the block's behavior (blockBehaviors.ts lists them); `block.behaviors` holds further behaviors as YAML.
 */
const BEHAVIOR: Record<string, PropertySpec> = {
  'block.states.arguments.slab_base_block': baseBlock('slab_base_block', ceBlockBehaviorDocs('slab_block')),
  'block.states.arguments.stairs_base_block': baseBlock('stairs_base_block', ceBlockBehaviorDocs('stairs_block')),
  'block.states.arguments.door_base_block': baseBlock('door_base_block', ceBlockBehaviorDocs('door_block')),
  'block.states.arguments.trapdoor_base_block': baseBlock('trapdoor_base_block', ceBlockBehaviorDocs('trapdoor_block')),
  'block.states.arguments.fence_gate_base_block': baseBlock('fence_gate_base_block', ceBlockBehaviorDocs('fence_gate_block')),
  'block.states.arguments.fence_base_block': baseBlock('fence_base_block', ceBlockBehaviorDocs('fence_block')),
  'block.states.arguments.fence_post_item': {
    field: field.text({ format: 'resource', placeholder: true }),
    defaultValue: () => '',
    hint: true,
    docs: ceBlockBehaviorDocs('fence_block'),
  },
  'block.states.arguments.fence_side_item': {
    field: field.text({ format: 'resource', placeholder: true }),
    defaultValue: () => '',
    docs: ceBlockBehaviorDocs('fence_block'),
  },
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
  'block.behavior.feature': {
    field: field.select([], { allowCustom: true, dynamicSuggestions: 'configuredFeatures', placeholder: true }),
    defaultValue: () => 'minecraft:oak',
    docs: ceBlockBehaviorDocs('sapling_block'),
  },
  'block.behavior.structure': {
    field: field.text({ format: 'resource', placeholder: true }),
    defaultValue: () => '',
    docs: ceBlockBehaviorDocs('sapling_block'),
  },
  'block.behavior.grow_speed': {
    field: field.number({ min: 0, step: 0.05 }),
    defaultValue: () => 0.25,
    docs: ceBlockBehaviorDocs('crop_block'),
  },
  'block.behavior.light_requirement': { field: lightLevel(), defaultValue: () => 9, docs: ceBlockBehaviorDocs('crop_block') },
  'block.behavior.max_light_requirement': { field: lightLevel(), defaultValue: () => 15, docs: ceBlockBehaviorDocs('crop_block') },
  'block.behavior.is_bone_meal_target': {
    field: field.boolean({ defaultHint: true }),
    defaultValue: () => false,
    docs: ceBlockBehaviorDocs('crop_block'),
  },
  'block.behavior.bone_meal_age_bonus': {
    field: field.number({ integer: true, min: 0 }),
    defaultValue: () => 1,
    docs: ceBlockBehaviorDocs('crop_block'),
  },
  'block.behavior.bone_meal_success_chance': {
    field: field.number({ min: 0, max: 1, step: 0.05 }),
    defaultValue: () => 0.45,
    docs: ceBlockBehaviorDocs('sapling_block'),
  },
  'block.behavior.can_open_with_hand': { field: field.boolean(), defaultValue: () => true, docs: ceBlockBehaviorDocs('door_block') },
  'block.behavior.can_open_by_wind_charge': {
    field: field.boolean({ defaultHint: true }),
    defaultValue: () => false,
    docs: ceBlockBehaviorDocs('door_block'),
  },
  'block.behavior.sounds': {
    field: field.object({ open: sound(), close: sound() }),
    defaultValue: () => ({ open: 'minecraft:block.wooden_door.open', close: 'minecraft:block.wooden_door.close' }),
    docs: ceBlockBehaviorDocs('door_block'),
  },
  'block.behavior.connectable_block_tag': {
    field: field.text({ format: 'resource', placeholder: true }),
    defaultValue: () => 'minecraft:wooden_fences',
    docs: ceBlockBehaviorDocs('fence_block'),
  },
  'block.behavior.can_leash': { field: field.boolean(), defaultValue: () => true, docs: ceBlockBehaviorDocs('fence_block') },
  'block.behavior.seats': {
    field: field.stringList({ placeholder: true }),
    defaultValue: () => ['0,0,0'],
    hint: true,
    docs: ceBlockBehaviorDocs('seat_block'),
  },
  'block.behavior.title': {
    field: field.text({ format: 'minimessage', placeholder: true }),
    defaultValue: () => '<lang:container.chest>',
    docs: ceBlockBehaviorDocs('simple_storage_block'),
  },
  'block.behavior.rows': {
    field: field.number({ integer: true, min: 1, max: 6 }),
    defaultValue: () => 3,
    docs: ceBlockBehaviorDocs('simple_storage_block'),
  },
  'block.behavior.has_signal': {
    field: field.boolean({ defaultHint: true }),
    defaultValue: () => false,
    docs: ceBlockBehaviorDocs('simple_storage_block'),
  },
  'block.behavior.allow_input': {
    field: field.boolean({ defaultHint: true }),
    defaultValue: () => false,
    docs: ceBlockBehaviorDocs('simple_storage_block'),
  },
  'block.behavior.allow_output': {
    field: field.boolean({ defaultHint: true }),
    defaultValue: () => false,
    docs: ceBlockBehaviorDocs('simple_storage_block'),
  },
  'block.behaviors': { field: field.yaml(), defaultValue: () => [{ type: 'falling_block' }], hint: true, docs: CE_DOCS.blockBehaviors },
};

export const CE_BLOCK_BEHAVIOR_PROPERTIES = properties('blockBehavior', BEHAVIOR);
