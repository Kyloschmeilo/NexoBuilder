/**
 * Block behaviors. The editor has a preset (form) for many of them; choosing one writes the main behavior
 * (`block.behavior`) and the states, support behaviors, drops and item behavior it needs: the jar's templates from the
 * default templates pack for slabs, stairs, doors, trapdoors, fences, fence gates, buttons and leaves, properties and
 * appearances written out for the others (ce/blockStates.ts builds them). Every behavior's keys are edited through the
 * block behavior catalog (logic/blockBehaviors.ts), and further behaviors go in the `block.behaviors` list. The checks
 * here find the state properties and keys a behavior needs that the block lacks.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject, ConfigValue, Item, Project } from '../project/types';
import { effectiveCraftEngineBlock } from './block';
import { ceBlockBehaviorDocs } from './form/schema/docs';
import {
  blockStates,
  CE_STATE_TEMPLATES,
  enumStates,
  intStates,
  oneLookStates,
  statesMap,
  statesTemplate,
  switchStates,
  templateArguments,
  withFacing,
} from './blockStates';
import { craftEngineItemKey } from './yaml';

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
  vine_crop_head_block: { age: 'int' },
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

/**
 * The properties a behavior needs beyond the table: the toggleable lamp needs `powered` unless a hand switches it
 * (`can_open_with_hand`, or its second name `can_toggle_with_hand`); a multi-high and a stackable block need the int
 * property their `property` key names (`amount` by default for a stackable block).
 */
function requiredProperties(behavior: Record<string, unknown>): Record<string, string> {
  const type = String(behavior.type);
  const required = CE_BEHAVIOR_REQUIRED_PROPERTIES[type] ?? {};
  const named = typeof behavior.property === 'string' && behavior.property.trim() ? behavior.property.trim() : null;
  if (type === 'toggleable_lamp_block' && behavior.can_open_with_hand !== true && behavior.can_toggle_with_hand !== true)
    return { ...required, powered: 'boolean' };
  if (type === 'stackable_block') return { [named ?? 'amount']: 'int' };
  if (type === 'multi_high_block' && named) return { [named]: 'int' };
  return required;
}

/**
 * The keys each behavior cannot do without (the plugin rejects the block without them: `getNonNull…` and
 * `getNonEmpty…` in its behavior factories); a list names keys of which one is enough (a sapling grows a feature or a
 * structure). Lists the plugin defaults to empty (a stackable block's items, a budding block's stages, a near-liquid
 * block's positions) are not required.
 */
export const CE_BEHAVIOR_REQUIRED_KEYS: Record<string, Array<string | string[]>> = {
  attached_stem_block: ['fruit', 'stem'],
  change_over_time_block: ['next_block'],
  concrete_powder_block: ['solid_block'],
  grass_block: [['feature', 'placed_feature']],
  multi_high_block: ['property'],
  sapling_block: [['feature', 'configured_feature', 'structure']],
  spreading_block: ['target_block'],
  stem_block: ['fruit', 'attached_stem'],
  strippable_block: ['stripped'],
  vine_crop_body_block: ['head'],
  vine_crop_head_block: ['body'],
};

const isSet = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  !(typeof value === 'string' && value.trim() === '') &&
  !(Array.isArray(value) && value.length === 0);

export interface MissingBehaviorKey {
  behavior: string;
  /** The key, or the keys of which one is needed joined by " / " */
  key: string;
}

/** The keys the block's behaviors cannot do without that they lack. */
export function missingBehaviorKeys(block: Record<string, unknown>): MissingBehaviorKey[] {
  return blockBehaviors(block).flatMap((behavior) =>
    (CE_BEHAVIOR_REQUIRED_KEYS[String(behavior.type)] ?? []).flatMap((required) => {
      const keys = Array.isArray(required) ? required : [required];
      return keys.some((key) => isSet(behavior[key])) ? [] : [{ behavior: String(behavior.type), key: keys.join(' / ') }];
    }),
  );
}

/**
 * Whether the block has a seagrass-like behavior but no water in its settings (`fluid_state: water`): such a block
 * then stands in air instead of water. The settings of a variant count too.
 */
export function seagrassWithoutWater(block: Record<string, unknown>): boolean {
  if (!blockBehaviors(block).some((behavior) => behavior.type === 'seagrass_like_block')) return false;
  const hasWater = (settings: unknown) => isPlainObject(settings) && settings.fluid_state === 'water';
  if (hasWater(block.settings)) return false;
  const states = blockStates(block);
  const variants = states && isPlainObject(states.variants) ? Object.values(states.variants) : [];
  return !variants.some((variant) => isPlainObject(variant) && hasWater(variant.settings));
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
  button_base_block: [...WOOD_TYPES, 'stone', 'polished_blackstone'].map((type) => `${type}_button`),
};

/**
 * The vanilla block a form starts with (and the form property adds). They avoid those of CraftEngine's own default
 * pack (petrified oak slab, cut copper stairs, oak door, trapdoor and fence gate), which servers usually load too;
 * fences and buttons may share one, as their look comes from item displays.
 */
export const CE_DEFAULT_BASE_BLOCKS: Record<keyof typeof CE_BASE_BLOCKS, string> = {
  slab_base_block: 'cut_copper_slab',
  stairs_base_block: 'exposed_cut_copper_stairs',
  door_base_block: 'spruce_door',
  trapdoor_base_block: 'spruce_trapdoor',
  fence_gate_base_block: 'spruce_fence_gate',
  fence_base_block: 'oak_fence',
  button_base_block: 'oak_button',
};

/** Leaves take no biome tint unless chosen (CraftEngine's default of the leaves template) */
export const CE_DEFAULT_LEAVES_TINTABLE = false;
const base = (key: keyof typeof CE_BASE_BLOCKS) => ({ [key]: CE_DEFAULT_BASE_BLOCKS[key] });

export interface BlockBehaviorForm {
  /** The behavior type (`slab_block`) */
  type: string;
  /** Ids of the `blockBehavior` form properties shown for it (the arguments of its state template) */
  properties: string[];
  /** The behavior, other behaviors written before it (support behaviors), the states and the drops the form starts with */
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
  /** The behavior's page in the CraftEngine wiki */
  docs: string;
}

const arg = (key: string) => `block.states.arguments.${key}`;
const template = (name: string, args: ConfigObject): ConfigObject => ({ template: `default:block_state/${name}`, arguments: args });
/** CraftEngine lets the block break when water flows into it and only stand on the given blocks (the jar's plants). */
const supportedBy = (support: ConfigObject): ConfigValue[] => [{ type: 'liquid_flowable_block' }, { type: 'bush_block', ...support }];

/**
 * A boolean property that switches between two appearances (`off`/`on`), with light while it is on; both start
 * with the item's model.
 */
function litStates(extra: ConfigObject = {}): ConfigObject {
  const states = switchStates('lit', ['off', 'on'], 'solid', { luminance: 15 });
  return { ...states, properties: { ...(states.properties as ConfigObject), ...extra } };
}

/** An int property `name` from 0 to `last` with one appearance per value (`stage_0` …). */
const stagedStates = (name: string, last: number, autoState: string) => intStates(name, 0, last, autoState, 'stage_');

/** A block entity with one look that faces the player (drawers, item frames, wall torches) */
const facingLook = (autoState = 'solid') => withFacing(oneLookStates({}, autoState));

/** The behaviors the editor has a form for (their vanilla blocks: CE_DEFAULT_BASE_BLOCKS), without their wiki pages. */
const FORMS: Array<Omit<BlockBehaviorForm, 'docs'>> = [
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
    properties: [arg('door_base_block')],
    preset: () => ({
      behavior: { type: 'door_block' },
      states: template('door', base('door_base_block')),
      loot: { template: 'default:loot_table/door' },
    }),
    itemBehavior: 'double_high_block_item',
  },
  {
    type: 'trapdoor_block',
    properties: [arg('trapdoor_base_block')],
    preset: () => ({ behavior: { type: 'trapdoor_block' }, states: template('trapdoor', base('trapdoor_base_block')) }),
  },
  {
    type: 'fence_block',
    properties: [arg('fence_base_block'), arg('fence_post_item'), arg('fence_side_item')],
    preset: (itemKey) => ({
      behavior: { type: 'fence_block' },
      states: template('fence', { ...base('fence_base_block'), fence_post_item: `${itemKey}_post`, fence_side_item: `${itemKey}_side` }),
    }),
  },
  {
    type: 'fence_gate_block',
    properties: [arg('fence_gate_base_block')],
    preset: () => ({
      behavior: { type: 'fence_gate_block' },
      states: template('fence_gate', base('fence_gate_base_block')),
    }),
  },
  // The jar's buttons: the button template on a vanilla button, placed on any face (face_attached…)
  {
    type: 'button_block',
    properties: [arg('button_base_block'), arg('button_not_pressed_item'), arg('button_pressed_item')],
    preset: (itemKey) => ({
      behavior: { type: 'button_block' },
      behaviors: [{ type: 'liquid_flowable_block' }, { type: 'face_attached_horizontal_directional_block' }],
      states: template('button', {
        ...base('button_base_block'),
        button_not_pressed_item: `${itemKey}_not_pressed`,
        button_pressed_item: `${itemKey}_pressed`,
      }),
    }),
  },
  {
    type: 'pressure_plate_block',
    properties: [],
    preset: () => ({
      behavior: { type: 'pressure_plate_block' },
      states: switchStates('powered', ['normal', 'powered'], 'pressure_plate'),
    }),
  },
  {
    type: 'crop_block',
    properties: [],
    preset: () => ({
      behavior: { type: 'crop_block' },
      behaviors: supportedBy({ bottom_blocks: ['minecraft:farmland'] }),
      states: stagedStates('age', 2, 'tripwire'),
    }),
    plant: true,
  },
  {
    type: 'sapling_block',
    properties: [],
    preset: () => ({
      behavior: { type: 'sapling_block', feature: 'minecraft:oak' },
      behaviors: supportedBy({ bottom_block_tags: ['minecraft:dirt', 'minecraft:supports_vegetation'] }),
      states: oneLookStates({ stage: { type: 'int', default: 0, range: '0~1' } }, 'sapling'),
    }),
    plant: true,
  },
  // A sugar-cane-like plant that grows upwards on itself (the jar's flame cane)
  {
    type: 'vertical_crop_block',
    properties: [],
    preset: () => ({
      behavior: { type: 'vertical_crop_block', max_height: 3 },
      behaviors: [{ type: 'bush_block', stackable: true, delay: 1, bottom_block_tags: ['minecraft:dirt'] }],
      states: oneLookStates({ age: { type: 'int', default: 0, range: '0~5' } }, 'sugar_cane'),
    }),
    plant: true,
  },
  // A melon or pumpkin stem; its fruit grows next to it and the attached stem (another block) points at the fruit
  {
    type: 'stem_block',
    properties: [],
    preset: () => ({
      behavior: { type: 'stem_block', fruit: 'minecraft:melon', attached_stem: '' },
      behaviors: supportedBy({ bottom_blocks: ['minecraft:farmland'] }),
      states: stagedStates('age', 7, 'tripwire'),
    }),
    plant: true,
  },
  {
    type: 'attached_stem_block',
    properties: [],
    preset: (itemKey) => ({
      behavior: {
        type: 'attached_stem_block',
        fruit: 'minecraft:melon',
        stem: itemKey.endsWith('_attached') ? itemKey.slice(0, -'_attached'.length) : '',
      },
      behaviors: supportedBy({ bottom_blocks: ['minecraft:farmland'] }),
      states: withFacing(oneLookStates({}, 'tripwire')),
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
    properties: [],
    preset: () => ({
      behavior: { type: 'toggleable_lamp_block', can_open_with_hand: true },
      states: litStates({ powered: { type: 'boolean', default: false } }),
    }),
  },
  {
    type: 'snowy_block',
    properties: [],
    preset: () => ({ behavior: { type: 'snowy_block' }, states: switchStates('snowy', ['default', 'snowy'], 'solid') }),
  },
  {
    type: 'hangable_block',
    properties: [],
    preset: () => ({ behavior: { type: 'hangable_block' }, states: switchStates('hanging', ['standing', 'hanging'], 'solid') }),
  },
  {
    type: 'sofa_block',
    properties: [],
    preset: () => ({ behavior: { type: 'sofa_block' }, states: withFacing(enumStates('shape', 'sofa_shape', 'solid')) }),
  },
  {
    type: 'double_high_block',
    properties: [],
    preset: () => ({ behavior: { type: 'double_high_block' }, states: enumStates('half', 'double_block_half', 'solid') }),
    itemBehavior: 'double_high_block_item',
  },
  {
    type: 'multi_high_block',
    properties: [],
    preset: () => ({ behavior: { type: 'multi_high_block', property: 'height' }, states: intStates('height', 0, 2, 'solid', 'height_') }),
    itemBehavior: 'multi_high_block_item',
  },
  // The jar's pebbles: up to three on one block, more by using the item on it
  {
    type: 'stackable_block',
    properties: [],
    preset: (itemKey) => ({
      behavior: { type: 'stackable_block', property: 'amount', items: [itemKey] },
      states: intStates('amount', 1, 3, 'lower_tripwire', 'amount_'),
    }),
  },
  {
    type: 'falling_block',
    properties: [],
    preset: () => ({ behavior: { type: 'falling_block' } }),
  },
  // Turns into its solid block in water, and falls like sand (the wiki's gunpowder block)
  {
    type: 'concrete_powder_block',
    properties: [],
    preset: () => ({ behavior: { type: 'concrete_powder_block', solid_block: '' }, behaviors: [{ type: 'falling_block' }] }),
  },
  {
    type: 'strippable_block',
    properties: [],
    preset: () => ({ behavior: { type: 'strippable_block', stripped: '' } }),
  },
  {
    type: 'drop_exp_block',
    properties: [],
    preset: () => ({ behavior: { type: 'drop_exp_block', amount: '1~3' } }),
  },
  {
    type: 'seat_block',
    properties: [],
    preset: () => ({ behavior: { type: 'seat_block', seats: ['0,0,0'] } }),
  },
  {
    type: 'simple_storage_block',
    properties: [],
    preset: () => ({ behavior: { type: 'simple_storage_block', rows: 3 } }),
  },
  {
    type: 'drawer_block',
    properties: [],
    preset: () => ({ behavior: { type: 'drawer_block' }, states: facingLook() }),
  },
  {
    type: 'display_item_block',
    properties: [],
    preset: () => ({ behavior: { type: 'display_item_block' }, states: facingLook() }),
  },
  {
    type: 'item_frame_block',
    properties: [],
    preset: () => ({ behavior: { type: 'item_frame_block' }, states: withFacing(oneLookStates({}, 'solid'), 'direction') }),
  },
  {
    type: 'tint_source_block',
    properties: [],
    preset: () => ({ behavior: { type: 'tint_source_block' } }),
  },
  {
    type: 'simple_particle_block',
    properties: [],
    preset: () => ({
      behavior: { type: 'simple_particle_block', tick_interval: 10, particles: [{ particle: 'minecraft:flame', x: 0.5, y: 0.7, z: 0.5 }] },
    }),
  },
  // The jar's wall torches: on the side of a block, with particles above the flame
  {
    type: 'wall_torch_particle_block',
    properties: [],
    preset: () => ({
      behavior: {
        type: 'wall_torch_particle_block',
        tick_interval: 10,
        particles: [{ particle: 'minecraft:flame', x: 0.5, y: 0.7, z: 0.5 }],
      },
      behaviors: [{ type: 'directional_attached_block' }, { type: 'liquid_flowable_block' }],
      states: facingLook('lower_tripwire'),
    }),
    itemBehavior: 'wall_block_item',
  },
  {
    type: 'directional_attached_block',
    properties: [],
    preset: () => ({ behavior: { type: 'directional_attached_block' }, states: facingLook('lower_tripwire') }),
    itemBehavior: 'wall_block_item',
  },
  // A lily-pad-like plant placed on the water's surface
  {
    type: 'on_liquid_block',
    properties: [],
    preset: () => ({ behavior: { type: 'on_liquid_block', liquid_type: 'water' } }),
    itemBehavior: 'liquid_collision_block_item',
    plant: true,
  },
];

/** The behaviors the editor has a form for, each with its wiki page. */
export const CE_BLOCK_BEHAVIOR_FORMS: BlockBehaviorForm[] = FORMS.map((form) => ({ ...form, docs: ceBlockBehaviorDocs(form.type) }));

/** The form (preset) of a behavior type, undefined when the editor has none. */
export function blockBehaviorForm(type: unknown): BlockBehaviorForm | undefined {
  return CE_BLOCK_BEHAVIOR_FORMS.find((form) => form.type === type);
}

/** The block's main behavior type (`block.behavior.type`), null without one; 'other' for a list or an untyped value. */
export function blockBehaviorType(block: Record<string, unknown>): string | null {
  const behavior = block.behavior ?? block.behaviors;
  if (behavior === undefined) return null;
  return isPlainObject(behavior) && typeof behavior.type === 'string' ? behavior.type : 'other';
}

/**
 * The `blockBehavior` form properties shown for the block: the template arguments of its behavior's form, the main
 * behavior when it is a list (one behavior is edited by its type's fields instead), and the further behaviors.
 */
export function blockBehaviorPropertyIds(block: Record<string, unknown>): string[] {
  const mainList = Array.isArray(block.behavior) ? ['block.behavior'] : [];
  return [...(blockBehaviorForm(blockBehaviorType(block))?.properties ?? []), ...mainList, 'block.behaviors'];
}

/** Drops the forms set themselves; a block that drops one of them gets the drops of its new behavior. */
const PRESET_LOOT = ['default:loot_table/self', 'default:loot_table/slab', 'default:loot_table/door'];

const asList = (value: unknown): ConfigValue[] =>
  value === undefined ? [] : Array.isArray(value) ? (value as ConfigValue[]) : [value as ConfigValue];
const typeOfEntry = (entry: unknown) => (isPlainObject(entry) && typeof entry.type === 'string' ? entry.type : undefined);
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Whether the block's states are those the preset of its current behavior wrote: the same template (its arguments
 * may have changed), or the same states written out. Other states are the user's own.
 */
function presetOwnsStates(block: Record<string, unknown>, itemKey: string): boolean {
  const states = blockStates(block);
  if (!states) return true;
  const preset = blockBehaviorForm(blockBehaviorType(block))?.preset(itemKey).states;
  if (!preset) return false;
  const template = statesTemplate(states);
  return template ? template === statesTemplate(preset) : sameValue(states, preset);
}

/**
 * Whether giving the block the behavior of this form (or none) would replace states of the user's own: the form needs
 * a template, or no states at all is asked for … while the block has states the user wrote (or a template of another
 * form). The editor asks before it replaces them; otherwise applyBlockBehavior keeps them.
 */
export function blockBehaviorReplacesStates(block: Record<string, unknown>, type: string | null, itemKey: string): boolean {
  const states = blockStates(block);
  if (!states || presetOwnsStates(block, itemKey)) return false;
  const preset = blockBehaviorForm(type)?.preset(itemKey).states;
  // Written-out states take the properties the form needs; a template replaces everything
  return preset !== undefined && (statesTemplate(preset) !== null || statesTemplate(states) !== null);
}

/** The user's states with the properties the form's states define added where they lack them. */
function withPresetProperties(states: Record<string, unknown>, preset: ConfigObject): ConfigObject {
  const properties = { ...statesMap(preset, 'properties'), ...statesMap(states, 'properties') };
  const result: ConfigObject = { ...(states as ConfigObject), properties: properties as ConfigObject };
  if (Object.keys(statesMap(states, 'appearances')).length === 0) {
    result.appearances = statesMap(preset, 'appearances') as ConfigObject;
    result.variants = { ...statesMap(preset, 'variants'), ...statesMap(states, 'variants') } as ConfigObject;
  }
  return result;
}

export interface ApplyBlockBehaviorOptions {
  /** Replace states of the user's own with the form's (after the user agreed); otherwise they are kept */
  replaceStates?: boolean;
}

/**
 * Gives the block the behavior of a form (with the states, support behaviors and drops it needs), or none (`null`:
 * a plain block). The settings and other keys stay, and so does the user's work:
 *  - further behaviors stay, except the support behaviors the old form added and the new one does not need; a
 *    support behavior the new form needs is added unless the list has one of its type (whose keys win);
 *  - a main behavior no form set up (written by hand) moves to the further behaviors;
 *  - states the old form wrote are replaced; states of the user's own are kept, with the properties the new form
 *    needs added (unless `replaceStates`; a template cannot be merged, see blockBehaviorReplacesStates).
 */
export function applyBlockBehavior(
  block: ConfigObject,
  type: string | null,
  itemKey: string,
  singleState: ConfigObject,
  { replaceStates = false }: ApplyBlockBehaviorOptions = {},
): ConfigObject {
  const { behavior: oldBehavior, behaviors: oldBehaviors, state, states: oldStates, ...rest } = block;
  const oldForm = blockBehaviorForm(blockBehaviorType(block));
  const form = blockBehaviorForm(type);
  const preset = form?.preset(itemKey);
  const keepLoot = !(isPlainObject(rest.loot) && PRESET_LOOT.includes(String(rest.loot.template)));
  const plainState = isPlainObject(state) ? state : singleState;

  // Further behaviors: the user's, without the old form's support behaviors the new form does not use
  const oldSupport = new Set((oldForm?.preset(itemKey).behaviors ?? []).map(typeOfEntry));
  const newSupport = preset?.behaviors ?? [];
  const newSupportTypes = new Set(newSupport.map(typeOfEntry));
  const kept = asList(oldBehaviors).filter((entry) => {
    const entryType = typeOfEntry(entry);
    return !(entryType && oldSupport.has(entryType) && !newSupportTypes.has(entryType));
  });
  const keptTypes = new Set(kept.map(typeOfEntry));
  // A main behavior written by hand moves to the further behaviors when a form takes its place
  const handWritten =
    !form || oldForm
      ? []
      : isPlainObject(oldBehavior) && oldBehavior.type !== type
        ? [oldBehavior]
        : Array.isArray(oldBehavior)
          ? oldBehavior
          : [];
  const behaviors = [...newSupport.filter((entry) => !keptTypes.has(typeOfEntry(entry))), ...kept, ...handWritten];

  const result: ConfigObject = { ...rest };
  if (behaviors.length > 0) result.behaviors = behaviors;
  if (preset) result.behavior = preset.behavior;

  // States: the user's own stay unless they are to be replaced
  const userStates = isPlainObject(oldStates) && !replaceStates && !presetOwnsStates(block, itemKey) ? oldStates : null;
  if (userStates) {
    result.states =
      preset?.states && !statesTemplate(preset.states) && !statesTemplate(userStates)
        ? withPresetProperties(userStates, preset.states)
        : (userStates as ConfigObject);
  } else if (preset?.states) result.states = preset.states;
  else result.state = plainState;

  if (!form) {
    if (!keepLoot && rest.loot) result.loot = { template: 'default:loot_table/self' };
    return result;
  }
  if (!keepLoot || !rest.loot) result.loot = preset?.loot ?? { template: 'default:loot_table/self' };
  return result;
}

/* ====================================================================== Storage */

/** Whether a storage block switches its look while open (its states have an `open` property). */
export function hasStorageOpenLook(block: Record<string, unknown>): boolean {
  const states = blockStates(block);
  return states !== null && isPlainObject(statesMap(states, 'properties').open);
}

/**
 * Gives a storage block an `open` boolean property with a look for closed and open (CraftEngine sets it while a
 * player has the container open), or takes it away again. A single state becomes the closed look and starts the
 * open look; states the block already has get the property only (their variants decide the looks).
 */
export function setStorageOpenLook(block: ConfigObject, open: boolean): ConfigObject {
  const states = blockStates(block);
  if (open) {
    if (states)
      return {
        ...block,
        states: {
          ...(states as ConfigObject),
          properties: { ...statesMap(states, 'properties'), open: { type: 'boolean', default: false } } as ConfigObject,
        },
      };
    const { state, ...rest } = block;
    const look = isPlainObject(state) ? state : { auto_state: 'solid' };
    return {
      ...rest,
      states: {
        properties: { open: { type: 'boolean', default: false } },
        appearances: { closed: look, open: look },
        variants: { 'open=false': { appearance: 'closed' }, 'open=true': { appearance: 'open' } },
      },
    };
  }
  if (!states) return block;
  const { open: _open, ...properties } = statesMap(states, 'properties');
  const variants = Object.fromEntries(Object.entries(statesMap(states, 'variants')).filter(([key]) => !/(^|,)\s*open=/.test(key)));
  // Only the open property: back to one state, the closed look
  if (Object.keys(properties).length === 0) {
    const { states: _states, ...rest } = block;
    const appearances = statesMap(states, 'appearances');
    const closed = appearances.closed ?? Object.values(appearances)[0];
    return { ...rest, state: (isPlainObject(closed) ? closed : { auto_state: 'solid' }) as ConfigObject };
  }
  return { ...block, states: { ...(states as ConfigObject), properties: properties as ConfigObject, variants: variants as ConfigObject } };
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
    const itemKey = craftEngineItemKey(project, item);
    const preset = blockBehaviorForm(blockBehaviorType(block))?.preset(itemKey).states;
    const base = templateArguments(states)[argument] ?? (isPlainObject(preset) ? templateArguments(preset)[argument] : undefined);
    if (typeof base !== 'string') continue;
    users.set(base, [...(users.get(base) ?? []), itemKey]);
  }
  return [...users].filter(([, blocks]) => blocks.length > 1).map(([block, blocks]) => ({ block, blocks }));
}
