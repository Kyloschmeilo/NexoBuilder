/**
 * Block behaviors. The editor has a form for the common ones; choosing one writes the behavior (`block.behavior`)
 * and the states it needs: the jar's templates from the default templates pack for slabs, stairs, doors,
 * trapdoors, fences, fence gates and leaves, properties and appearances written out for crops, saplings and lamps.
 * Every other behavior is written in the item's additional YAML (`block: { behavior: … }`).
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject, ConfigValue, Item, Project } from '../project/types';
import { effectiveCraftEngineBlock } from './block';
import { blockStates, CE_STATE_TEMPLATES, statesTemplate, templateArguments } from './blockStates';

/** Behavior types the plugin checks a property's Java type for: both direction types are one type there. */
const PROPERTY_CLASS: Record<string, string> = { horizontal_direction: 'direction' };
const propertyClass = (type: string) => PROPERTY_CLASS[type] ?? type;

const H = 'horizontal_direction';
/**
 * The properties each behavior requires, by name and type (the behavior pages of the wiki, checked against the
 * plugin's behavior factories). A `facing` of `direction` type is the plugin's Direction either way.
 */
export const CE_BEHAVIOR_REQUIRED_PROPERTIES: Record<string, Record<string, string>> = {
  attached_stem_block: { facing: H },
  button_block: { powered: 'boolean' },
  crop_block: { age: 'int' },
  decay_block: { age: 'int' },
  directional_attached_block: { facing: H },
  door_block: { open: 'boolean', powered: 'boolean', half: 'double_block_half', facing: H, hinge: 'hinge' },
  double_high_block: { half: 'double_block_half' },
  face_attached_horizontal_directional_block: { face: 'anchor_type', facing: H },
  fence_block: { north: 'boolean', east: 'boolean', south: 'boolean', west: 'boolean' },
  fence_gate_block: { open: 'boolean', powered: 'boolean', in_wall: 'boolean', facing: H },
  hangable_block: { hanging: 'boolean' },
  item_frame_block: { facing: 'direction' },
  lamp_block: { lit: 'boolean' },
  leaves_block: { distance: 'int', persistent: 'boolean' },
  pressure_plate_block: { powered: 'boolean' },
  sapling_block: { stage: 'int' },
  slab_block: { type: 'slab_type' },
  snowy_block: { snowy: 'boolean' },
  sofa_block: { shape: 'sofa_shape', facing: H },
  stairs_block: { shape: 'stairs_shape', half: 'single_block_half', facing: H },
  stem_block: { age: 'int' },
  toggleable_lamp_block: { lit: 'boolean' },
  trapdoor_block: { open: 'boolean', powered: 'boolean', half: 'single_block_half', facing: H },
  vertical_crop_block: { age: 'int' },
  wall_torch_particle_block: { facing: 'direction' },
};

/** The properties a behavior needs beyond the table: the toggleable lamp needs `powered` unless a hand opens it. */
function requiredProperties(behavior: Record<string, unknown>): Record<string, string> {
  const type = String(behavior.type);
  const required = CE_BEHAVIOR_REQUIRED_PROPERTIES[type] ?? {};
  if (type === 'toggleable_lamp_block' && behavior.can_open_with_hand !== true) return { ...required, powered: 'boolean' };
  return required;
}

/** The block's behaviors (`behavior` and `behaviors`, each a behavior or a list of them). */
export function blockBehaviors(block: Record<string, unknown>): Array<Record<string, unknown>> {
  return [block.behaviors, block.behavior].flatMap((value) => (Array.isArray(value) ? value : [value])).filter(isPlainObject);
}

export interface MissingBehaviorProperty {
  behavior: string;
  property: string;
  type: string;
}

/**
 * The properties the block's behaviors require that its states lack (or have with another type). Each one is
 * missing for a block with a single state; for a template the editor does not know, nothing can be checked.
 */
export function missingBehaviorProperties(
  block: Record<string, unknown>,
  propertyTypes: Record<string, string | undefined> | null,
): MissingBehaviorProperty[] {
  if (propertyTypes === null && blockStates(block)) return [];
  return blockBehaviors(block).flatMap((behavior) =>
    Object.entries(requiredProperties(behavior)).flatMap(([property, type]) => {
      const actual = propertyTypes?.[property];
      return actual && propertyClass(actual) === propertyClass(type) ? [] : [{ behavior: String(behavior.type), property, type }];
    }),
  );
}

/* ====================================================================== Forms */

/** Vanilla blocks whose unused states the templates borrow (the jar's tree.yml lists them). */
const WOOD_TYPES = [
  'oak',
  'spruce',
  'birch',
  'jungle',
  'acacia',
  'dark_oak',
  'mangrove',
  'cherry',
  'pale_oak',
  'bamboo',
  'warped',
  'crimson',
];
const COPPER_TYPES = ['copper', 'exposed_copper', 'weathered_copper', 'oxidized_copper'];
const CUT_COPPER_TYPES = ['cut_copper', 'exposed_cut_copper', 'weathered_cut_copper', 'oxidized_cut_copper'];
const DOOR_TYPES = [...WOOD_TYPES, 'iron', ...COPPER_TYPES.flatMap((type) => [type, `waxed_${type}`])];

/** The vanilla blocks each template argument can borrow from. */
export const CE_BASE_BLOCKS = {
  slab_base_block: ['petrified_oak', ...CUT_COPPER_TYPES].map((type) => `${type}_slab`),
  stairs_base_block: CUT_COPPER_TYPES.map((type) => `${type}_stairs`),
  door_base_block: DOOR_TYPES.map((type) => `${type}_door`),
  trapdoor_base_block: DOOR_TYPES.map((type) => `${type}_trapdoor`),
  fence_gate_base_block: WOOD_TYPES.map((type) => `${type}_fence_gate`),
  fence_base_block: [...WOOD_TYPES, 'nether_brick'].map((type) => `${type}_fence`),
};

/**
 * The vanilla block a form starts with (and the form property adds). They avoid those of CraftEngine's own default
 * pack (petrified oak slab, cut copper stairs, oak door, trapdoor and fence gate), which servers usually load too;
 * fences may share one, as their look comes from item displays.
 */
export const CE_DEFAULT_BASE_BLOCKS: Record<keyof typeof CE_BASE_BLOCKS, string> = {
  slab_base_block: 'cut_copper_slab',
  stairs_base_block: 'exposed_cut_copper_stairs',
  door_base_block: 'spruce_door',
  trapdoor_base_block: 'spruce_trapdoor',
  fence_gate_base_block: 'spruce_fence_gate',
  fence_base_block: 'oak_fence',
};

/** Leaves take no biome tint unless chosen (CraftEngine's default of the leaves template) */
export const CE_DEFAULT_LEAVES_TINTABLE = false;
const base = (key: keyof typeof CE_BASE_BLOCKS) => ({ [key]: CE_DEFAULT_BASE_BLOCKS[key] });

export interface BlockBehaviorForm {
  /** The behavior type (`slab_block`) */
  type: string;
  /** Ids of the `blockBehavior` form properties shown for it */
  properties: string[];
  /** The behavior, other behaviors written before it, the states and the drops the form starts with */
  preset: (itemKey: string) => {
    behavior: ConfigObject;
    behaviors?: ConfigValue[];
    states?: ConfigObject;
    loot?: ConfigObject;
  };
  /** The block is a plant: a flat texture becomes a cross (two crossed planes) rather than a cube */
  plant?: boolean;
  /** The item behavior that places it (a door is two blocks high) */
  itemBehavior?: string;
}

const prop = (key: string) => `block.behavior.${key}`;
const arg = (key: string) => `block.states.arguments.${key}`;
const OPENABLE = [prop('can_open_with_hand'), prop('can_open_by_wind_charge'), prop('sounds')];
const GROWING = [prop('grow_speed'), prop('light_requirement'), prop('max_light_requirement')];
const template = (name: string, args: ConfigObject): ConfigObject => ({ template: `default:block_state/${name}`, arguments: args });
/** CraftEngine lets the block break when water flows into it and only stand on the given blocks (the jar's plants). */
const supportedBy = (support: ConfigObject): ConfigValue[] => [{ type: 'liquid_flowable_block' }, { type: 'bush_block', ...support }];

/**
 * A boolean property that switches between two appearances (`off`/`on`), with light while it is on; both start
 * with the item's model.
 */
function litStates(extra: ConfigObject = {}): ConfigObject {
  return {
    properties: { lit: { type: 'boolean', default: false }, ...extra },
    appearances: { off: { auto_state: 'solid' }, on: { auto_state: 'solid' } },
    variants: { 'lit=false': { appearance: 'off' }, 'lit=true': { appearance: 'on', settings: { luminance: 15 } } },
  };
}

/** An int property `name` from 0 to `last` with one appearance per value (`stage_0` …). */
function stagedStates(name: string, last: number, autoState: string): ConfigObject {
  const stages = Array.from({ length: last + 1 }, (_, i) => i);
  return {
    properties: { [name]: { type: 'int', default: 0, range: `0~${last}` } },
    appearances: Object.fromEntries(stages.map((i) => [`stage_${i}`, { auto_state: autoState }])),
    variants: Object.fromEntries(stages.map((i) => [`${name}=${i}`, { appearance: `stage_${i}` }])),
  };
}

/** The behaviors the editor has a form for (their vanilla blocks: CE_DEFAULT_BASE_BLOCKS). */
export const CE_BLOCK_BEHAVIOR_FORMS: BlockBehaviorForm[] = [
  {
    type: 'slab_block',
    properties: [arg('slab_base_block')],
    preset: () => ({
      behavior: { type: 'slab_block' },
      states: template('slab', base('slab_base_block')),
      loot: { template: 'default:loot_table/slab' },
    }),
  },
  {
    type: 'stairs_block',
    properties: [arg('stairs_base_block')],
    preset: () => ({ behavior: { type: 'stairs_block' }, states: template('stairs', base('stairs_base_block')) }),
  },
  {
    type: 'door_block',
    properties: [arg('door_base_block'), ...OPENABLE],
    preset: () => ({
      behavior: { type: 'door_block' },
      states: template('door', base('door_base_block')),
      loot: { template: 'default:loot_table/door' },
    }),
    itemBehavior: 'double_high_block_item',
  },
  {
    type: 'trapdoor_block',
    properties: [arg('trapdoor_base_block'), ...OPENABLE],
    preset: () => ({ behavior: { type: 'trapdoor_block' }, states: template('trapdoor', base('trapdoor_base_block')) }),
  },
  {
    type: 'fence_block',
    properties: [arg('fence_base_block'), arg('fence_post_item'), arg('fence_side_item'), prop('connectable_block_tag'), prop('can_leash')],
    preset: (itemKey) => ({
      behavior: { type: 'fence_block' },
      states: template('fence', { ...base('fence_base_block'), fence_post_item: `${itemKey}_post`, fence_side_item: `${itemKey}_side` }),
    }),
  },
  {
    type: 'fence_gate_block',
    properties: [arg('fence_gate_base_block'), ...OPENABLE],
    preset: () => ({
      behavior: { type: 'fence_gate_block' },
      states: template('fence_gate', base('fence_gate_base_block')),
    }),
  },
  {
    type: 'crop_block',
    properties: [...GROWING, prop('is_bone_meal_target'), prop('bone_meal_age_bonus')],
    preset: () => ({
      behavior: { type: 'crop_block' },
      behaviors: supportedBy({ bottom_blocks: ['minecraft:farmland'] }),
      states: stagedStates('age', 2, 'tripwire'),
    }),
    plant: true,
  },
  {
    type: 'sapling_block',
    properties: [prop('feature'), prop('structure'), ...GROWING, prop('bone_meal_success_chance')],
    preset: () => ({
      behavior: { type: 'sapling_block', feature: 'minecraft:oak' },
      behaviors: supportedBy({ bottom_block_tags: ['minecraft:dirt', 'minecraft:supports_vegetation'] }),
      states: {
        properties: { stage: { type: 'int', default: 0, range: '0~1' } },
        appearances: { default: { auto_state: 'sapling' } },
        variants: {},
      },
    }),
    plant: true,
  },
  {
    type: 'leaves_block',
    properties: [arg('leaves_tintable'), arg('leaves_max_distance')],
    preset: () => ({ behavior: { type: 'leaves_block' }, states: template('leaves', { leaves_tintable: CE_DEFAULT_LEAVES_TINTABLE }) }),
  },
  {
    type: 'lamp_block',
    properties: [],
    preset: () => ({ behavior: { type: 'lamp_block' }, states: litStates() }),
  },
  {
    type: 'toggleable_lamp_block',
    properties: [prop('can_open_with_hand')],
    preset: () => ({
      behavior: { type: 'toggleable_lamp_block', can_open_with_hand: true },
      states: litStates({ powered: { type: 'boolean', default: false } }),
    }),
  },
  {
    type: 'seat_block',
    properties: [prop('seats')],
    preset: () => ({ behavior: { type: 'seat_block', seats: ['0,0,0'] } }),
  },
  {
    type: 'simple_storage_block',
    properties: [prop('title'), prop('rows'), prop('has_signal'), prop('allow_input'), prop('allow_output'), prop('sounds')],
    preset: () => ({ behavior: { type: 'simple_storage_block', rows: 3 } }),
  },
];

/** The form of a behavior type, undefined when the editor has none (other behaviors live in the YAML). */
export function blockBehaviorForm(type: unknown): BlockBehaviorForm | undefined {
  return CE_BLOCK_BEHAVIOR_FORMS.find((form) => form.type === type);
}

/** The block's main behavior type (`block.behavior.type`), null without one; 'other' for a list or an untyped value. */
export function blockBehaviorType(block: Record<string, unknown>): string | null {
  const behavior = block.behavior ?? block.behaviors;
  if (behavior === undefined) return null;
  return isPlainObject(behavior) && typeof behavior.type === 'string' ? behavior.type : 'other';
}

/** The `blockBehavior` form properties shown for the block (those of its behavior's form, and the extra behaviors). */
export function blockBehaviorPropertyIds(block: Record<string, unknown>): string[] {
  return [...(blockBehaviorForm(blockBehaviorType(block))?.properties ?? []), 'block.behaviors'];
}

/** Drops the forms set themselves; a block that drops one of them gets the drops of its new behavior. */
const PRESET_LOOT = ['default:loot_table/self', 'default:loot_table/slab', 'default:loot_table/door'];

/**
 * Gives the block the behavior of a form (with the states it needs), or none (`null`: a plain block with a single
 * state). The settings and other keys stay; the states the old behavior needed are replaced.
 */
export function applyBlockBehavior(block: ConfigObject, type: string | null, itemKey: string, singleState: ConfigObject): ConfigObject {
  const { behavior: _behavior, behaviors: _behaviors, state, states: _states, ...rest } = block;
  const form = blockBehaviorForm(type);
  const keepLoot = !(isPlainObject(rest.loot) && PRESET_LOOT.includes(String(rest.loot.template)));
  const plainState = isPlainObject(state) ? state : singleState;
  if (!form) {
    if (keepLoot || !rest.loot) return { ...rest, state: plainState };
    return { ...rest, state: plainState, loot: { template: 'default:loot_table/self' } };
  }
  const preset = form.preset(itemKey);
  const result: ConfigObject = { ...rest };
  if (preset.behaviors) result.behaviors = preset.behaviors;
  result.behavior = preset.behavior;
  if (preset.states) result.states = preset.states;
  else result.state = plainState;
  if (!keepLoot || !rest.loot) result.loot = preset.loot ?? { template: 'default:loot_table/self' };
  return result;
}

export interface SharedBaseBlock {
  /** The vanilla block (`cut_copper_slab`) */
  block: string;
  /** The keys of the project's blocks that borrow its states */
  blocks: string[];
}

/**
 * Vanilla blocks whose free states several of the project's blocks borrow through a template (two slabs on
 * `cut_copper_slab`): CraftEngine can give each vanilla state only one look.
 */
export function sharedBaseBlocks(project: Pick<Project, 'items' | 'namespace'>): SharedBaseBlock[] {
  const users = new Map<string, string[]>();
  for (const item of Object.values(project.items) as Item[]) {
    const block = effectiveCraftEngineBlock(item);
    const states = block && blockStates(block);
    const template = states && statesTemplate(states);
    const argument = template && CE_STATE_TEMPLATES[template]?.baseArgument;
    if (!states || !argument) continue;
    const itemKey = `${project.namespace}:${item.itemId}`;
    const preset = blockBehaviorForm(blockBehaviorType(block))?.preset(itemKey).states;
    const base = templateArguments(states)[argument] ?? (isPlainObject(preset) ? templateArguments(preset)[argument] : undefined);
    if (typeof base !== 'string') continue;
    users.set(base, [...(users.get(base) ?? []), itemKey]);
  }
  return [...users].filter(([, blocks]) => blocks.length > 1).map(([block, blocks]) => ({ block, blocks }));
}
