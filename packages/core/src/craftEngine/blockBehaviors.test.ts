/**
 * The block behavior catalog (every behavior of the plugin's registry with its keys and wiki page), the checks of the
 * properties and keys a behavior needs, the presets with the states they build, and blocks of older projects whose
 * `block.behavior(s)` were written as YAML.
 */
import { describe, expect, it } from 'vitest';
import type { Field } from '../form/fields';
import { checkFieldValue } from '../form/fieldSchema';
import { cleanConfig } from '../form/prune';
import type { ConfigObject, ConfigValue } from '../project/types';
import {
  applyBlockBehavior,
  blockBehaviorPropertyIds,
  CE_BLOCK_BEHAVIOR_FORMS,
  missingBehaviorKeys,
  missingBehaviorProperties,
  seagrassWithoutWater,
} from './blockBehaviors';
import { blockPropertyTypes, enumStates, intStates, oneLookStates, switchStates, withFacing } from './blockStates';
import { CRAFT_ENGINE_FORM } from './form/schema';
import { CE_BLOCK_BEHAVIORS, CE_FUNCTIONS } from './logic';

const WIKI = 'https://xiao-momi.github.io/craft-engine-wiki/configuration/block/behaviors';
const SOLID = { auto_state: 'solid' };

/** The keys of `BukkitBlockBehaviors` (CraftEngine 26.9, b3079c5) except `empty` */
const REGISTRY = [
  'bush_block',
  'hanging_block',
  'falling_block',
  'leaves_block',
  'strippable_block',
  'sapling_block',
  'on_liquid_block',
  'near_liquid_block',
  'concrete_powder_block',
  'vertical_crop_block',
  'crop_block',
  'grass_block',
  'lamp_block',
  'trapdoor_block',
  'door_block',
  'stackable_block',
  'sturdy_base_block',
  'fence_gate_block',
  'slab_block',
  'stairs_block',
  'pressure_plate_block',
  'double_high_block',
  'change_over_time_block',
  'simple_storage_block',
  'toggleable_lamp_block',
  'sofa_block',
  'bouncing_block',
  'directional_attached_block',
  'liquid_flowable_block',
  'simple_particle_block',
  'wall_torch_particle_block',
  'fence_block',
  'button_block',
  'face_attached_horizontal_directional_block',
  'stem_block',
  'attached_stem_block',
  'chime_block',
  'budding_block',
  'seat_block',
  'surface_spreading_block',
  'snowy_block',
  'hangable_block',
  'drop_experience_block',
  'drop_exp_block',
  'multi_high_block',
  'spreading_block',
  'item_frame_block',
  'display_item_block',
  'drawer_block',
  'tint_source_block',
  'vine_crop_head_block',
  'vine_crop_body_block',
  'decay_block',
  'seagrass_like_block',
];

const typeOf = (type: string) => CE_BLOCK_BEHAVIORS.find((t) => t.type === type)!;
const keysOf = (type: string) => typeOf(type).fields.map((f) => f.key);
const fieldOf = (type: string, key: string) => typeOf(type).fields.find((f) => f.key === key)!;
const childKeys = (field: Field) => (field.type === 'object' || field.type === 'objectList' ? field.fields.map((f) => f.key) : []);
const withBehavior = (type: string | null, block: ConfigObject = { state: SOLID }) => applyBlockBehavior(block, type, 'blocks:b0', SOLID);

describe('the block behavior catalog', () => {
  it('has every behavior of the plugin registry', () => {
    expect(CE_BLOCK_BEHAVIORS.map((t) => t.type).sort()).toEqual([...REGISTRY].sort());
  });

  it('links each behavior to its own wiki page', () => {
    expect(typeOf('crop_block').docs).toBe(`${WIKI}/crop_block`);
    expect(typeOf('drop_exp_block').docs).toBe(`${WIKI}/drop_experience_block`);
    expect(typeOf('drop_experience_block').docs).toBe(`${WIKI}/drop_experience_block`);
    // Not on the wiki yet: the behaviors page
    expect(typeOf('vine_crop_head_block').docs).toBe(WIKI);
    for (const t of CE_BLOCK_BEHAVIORS) expect(t.docs?.startsWith(WIKI)).toBe(true);
  });

  it('edits every key of the behavior factories', () => {
    expect(keysOf('drawer_block')).toEqual([
      'max_stacks',
      'has_signal',
      'allow_input',
      'allow_output',
      'item_position',
      'text_position',
      'item_scale',
      'text_scale',
      'data_key',
      'compatible_mode',
      'sounds',
    ]);
    expect(childKeys(fieldOf('button_block', 'sounds'))).toEqual(['on', 'off']);
    expect(childKeys(fieldOf('item_frame_block', 'sounds'))).toEqual(['put', 'take', 'rotate']);
    expect(keysOf('crop_block')).toEqual([
      'grow_speed',
      'light_requirement',
      'max_light_requirement',
      'spawn_light_requirement',
      'max_spawn_light_requirement',
      'is_bone_meal_target',
      'bone_meal_age_bonus',
    ]);
    expect(fieldOf('crop_block', 'bone_meal_age_bonus').type).toBe('numberProvider');
    expect(keysOf('bush_block')).toEqual(['blacklist', 'stackable', 'max_height', 'delay', 'bottom_blocks', 'bottom_block_tags']);
    expect(keysOf('stem_block')).toContain('fruit_bottom_block_tags');
    // The plugin reads grow_blocks inside bone_meal (VineCropHeadBlockBehavior.Factory)
    expect(childKeys(fieldOf('vine_crop_head_block', 'bone_meal'))).toEqual(['behavior', 'grow_blocks']);
    expect(fieldOf('vine_crop_head_block', 'bone_meal').advanced).toBe(true);
    expect(childKeys(fieldOf('simple_particle_block', 'particles'))).toContain('block_state');
  });

  it('accepts a sound as an id or with volume and pitch', () => {
    const sounds = fieldOf('door_block', 'sounds');
    expect(
      checkFieldValue({ open: 'minecraft:block.wooden_door.open', close: { id: 'minecraft:x', volume: 1, pitch: '0.9~1' } }, sounds),
    ).toEqual([]);
  });

  it('shares the particle keys with the particle function, each data key shown for its particles only', () => {
    const particle = CE_FUNCTIONS.find((t) => t.type === 'particle')!;
    const color = particle.fields.find((f) => f.key === 'color')!;
    expect(color.showIf?.values).toContain('minecraft:dust');
    expect(color.showIf?.values).toContain('dust');
    expect(color.label).toBe('logic.shared.particle.color.label');
    expect(particle.fields.map((f) => f.key)).toEqual([...childKeys(fieldOf('wall_torch_particle_block', 'particles')), 'conditions']);
  });
});

describe('the checks of a block behavior', () => {
  it('needs the int property a stackable or multi-high block names', () => {
    const stackable = {
      states: { properties: { pebbles: { type: 'int', range: '1~3' } } },
      behavior: { type: 'stackable_block', property: 'pebbles', items: ['a:b'] },
    };
    expect(missingBehaviorProperties(stackable, blockPropertyTypes(stackable))).toEqual([]);
    const byDefault = { ...stackable, behavior: { type: 'stackable_block', items: ['a:b'] } };
    expect(missingBehaviorProperties(byDefault, blockPropertyTypes(byDefault))).toEqual([
      { behavior: 'stackable_block', property: 'amount', type: 'int' },
    ]);
    const tall = { state: SOLID, behaviors: [{ type: 'multi_high_block', property: 'height' }] };
    expect(missingBehaviorProperties(tall, blockPropertyTypes(tall))).toEqual([
      { behavior: 'multi_high_block', property: 'height', type: 'int' },
    ]);
  });

  it('accepts the second name of the toggleable lamp key', () => {
    const lamp = {
      states: { properties: { lit: { type: 'boolean' } } },
      behavior: { type: 'toggleable_lamp_block', can_toggle_with_hand: true },
    };
    expect(missingBehaviorProperties(lamp, blockPropertyTypes(lamp))).toEqual([]);
  });

  it('reports the keys a behavior cannot do without', () => {
    const block = {
      behaviors: [
        { type: 'concrete_powder_block', solid_block: '' },
        { type: 'falling_block' },
        { type: 'sapling_block', structure: 'a:tree' },
      ],
      behavior: { type: 'stem_block', fruit: 'minecraft:melon' },
    };
    expect(missingBehaviorKeys(block)).toEqual([
      { behavior: 'concrete_powder_block', key: 'solid_block' },
      { behavior: 'stem_block', key: 'attached_stem' },
    ]);
    expect(missingBehaviorKeys({ behavior: { type: 'grass_block', placed_feature: 'a:b' } })).toEqual([]);
  });

  it('warns about a seagrass-like block without water', () => {
    expect(seagrassWithoutWater({ behavior: { type: 'seagrass_like_block' } })).toBe(true);
    expect(seagrassWithoutWater({ behavior: { type: 'seagrass_like_block' }, settings: { fluid_state: 'water' } })).toBe(false);
    const variants = { states: { variants: { 'waterlogged=true': { settings: { fluid_state: 'water' } } } } };
    expect(seagrassWithoutWater({ behaviors: [{ type: 'seagrass_like_block' }], ...variants })).toBe(false);
    expect(seagrassWithoutWater({ behavior: { type: 'falling_block' } })).toBe(false);
  });
});

describe('the behavior presets', () => {
  it('are behaviors of the catalog', () => {
    const types = new Set(CE_BLOCK_BEHAVIORS.map((t) => t.type));
    expect(CE_BLOCK_BEHAVIOR_FORMS.filter((form) => !types.has(form.type)).map((form) => form.type)).toEqual([]);
    expect(CE_BLOCK_BEHAVIOR_FORMS.length).toBeGreaterThanOrEqual(35);
  });

  it.each(CE_BLOCK_BEHAVIOR_FORMS.map((form) => [form.type]))('set up the states %s needs', (type) => {
    const block = withBehavior(type);
    expect(missingBehaviorProperties(block, blockPropertyTypes(block))).toEqual([]);
  });

  it('leave only the keys the user has to fill in missing', () => {
    const missing = CE_BLOCK_BEHAVIOR_FORMS.flatMap((form) =>
      missingBehaviorKeys(cleanConfig(CRAFT_ENGINE_FORM, { block: withBehavior(form.type) }).block as ConfigObject),
    );
    expect(missing).toEqual([
      { behavior: 'concrete_powder_block', key: 'solid_block' },
      { behavior: 'strippable_block', key: 'stripped' },
    ]);
  });

  it('write the jar’s button: the button template on any face', () => {
    const button = withBehavior('button_block');
    expect(button.states).toEqual({
      template: 'default:block_state/button',
      arguments: {
        button_base_block: 'oak_button',
        button_not_pressed_item: 'blocks:b0_not_pressed',
        button_pressed_item: 'blocks:b0_pressed',
      },
    });
    expect(button.behaviors).toEqual([{ type: 'liquid_flowable_block' }, { type: 'face_attached_horizontal_directional_block' }]);
    expect(blockBehaviorPropertyIds(button)).toEqual([
      'block.states.arguments.button_base_block',
      'block.states.arguments.button_not_pressed_item',
      'block.states.arguments.button_pressed_item',
      'block.behaviors',
    ]);
  });

  it('give a stackable block one look per amount and the item to add', () => {
    expect(withBehavior('stackable_block')).toMatchObject({
      behavior: { type: 'stackable_block', property: 'amount', items: ['blocks:b0'] },
      states: { properties: { amount: { type: 'int', default: 1, range: '1~3' } }, variants: { 'amount=3': { appearance: 'amount_3' } } },
    });
  });

  it('show the main behavior as a list only when it is one', () => {
    expect(blockBehaviorPropertyIds({ behavior: [{ type: 'falling_block' }] })).toEqual(['block.behavior', 'block.behaviors']);
  });
});

describe('the state builders', () => {
  it('switch, count and name appearances by a property', () => {
    expect(switchStates('powered', ['normal', 'powered'], 'pressure_plate')).toEqual({
      properties: { powered: { type: 'boolean', default: false } },
      appearances: { normal: { auto_state: 'pressure_plate' }, powered: { auto_state: 'pressure_plate' } },
      variants: { 'powered=false': { appearance: 'normal' }, 'powered=true': { appearance: 'powered' } },
    });
    expect(Object.keys(intStates('age', 0, 2, 'tripwire', 'stage_').appearances as object)).toEqual(['stage_0', 'stage_1', 'stage_2']);
    expect(enumStates('half', 'double_block_half', 'solid').variants).toEqual({
      'half=upper': { appearance: 'upper' },
      'half=lower': { appearance: 'lower' },
    });
  });

  it('turn a look to all six directions', () => {
    const states = withFacing(oneLookStates({}, 'solid'), 'direction');
    expect(states.properties).toEqual({ facing: { type: 'direction', default: 'north' } });
    expect((states.appearances as Record<string, unknown>).default_up).toEqual({ auto_state: 'solid', model: { x: 270 } });
    expect((states.appearances as Record<string, unknown>).default_east).toEqual({ auto_state: 'solid', model: { y: 90 } });
    expect(Object.keys(states.variants as object)).toHaveLength(6);
  });
});

describe('blocks of older projects', () => {
  const behaviorsField = CRAFT_ENGINE_FORM.properties.find((p) => p.id === 'block.behaviors')!.field;
  const behaviorField = CRAFT_ENGINE_FORM.properties.find((p) => p.id === 'block.behavior')!.field;

  it('keep further behaviors written as YAML: a list, one behavior, unknown types and version keys', () => {
    const list: ConfigObject[] = [
      { type: 'falling_block', hurt_amount: 2, max_hurt: 40 },
      { type: 'bush_block', bottom_block_tags: ['minecraft:dirt'], $$26_2: { stackable: true } },
      { type: 'my_addon:glow', level: 3 },
    ];
    const single: ConfigObject = { type: 'concrete_powder_block', solid_block: 'blocks:solid' };
    for (const behaviors of [list, single] as ConfigValue[]) {
      expect(checkFieldValue(behaviors, behaviorsField)).toEqual([]);
      expect(cleanConfig(CRAFT_ENGINE_FORM, { block: { state: SOLID, behaviors } }).block).toEqual({ state: SOLID, behaviors });
    }
  });

  it('keep the keys the old behavior forms wrote', () => {
    const behavior: ConfigObject = {
      type: 'crop_block',
      grow_speed: 0.25,
      light_requirement: 9,
      max_light_requirement: 15,
      is_bone_meal_target: false,
      bone_meal_age_bonus: 1,
    };
    const door: ConfigObject = {
      type: 'door_block',
      can_open_with_hand: true,
      sounds: { open: 'minecraft:block.wooden_door.open', close: 'minecraft:block.wooden_door.close' },
    };
    for (const value of [behavior, door]) {
      expect(checkFieldValue(value, behaviorField)).toEqual([]);
      expect(cleanConfig(CRAFT_ENGINE_FORM, { block: { behavior: value } }).block).toEqual({ behavior: value });
    }
  });
});
