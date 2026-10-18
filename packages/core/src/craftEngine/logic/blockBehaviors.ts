/**
 * The block behavior types (`BukkitBlockBehaviors`, checked against each behavior's factory in the plugin source):
 * the 51 behaviors of the wiki, the second name `drop_experience_block` of `drop_exp_block`, and the vine crop pair
 * (`vine_crop_head_block`, `vine_crop_body_block`) the wiki does not document yet. `empty` is left out (it does
 * nothing). Each type links to its page of the wiki; keys the plugin reads but the wiki does not document are
 * advanced fields. The block state properties each behavior needs are checked in ../blockBehaviors.ts.
 */
import { isPlainObject, keySegment } from '@resourcepackbuilder/utils';
import { field, type FieldSpec, type FieldSpecs } from '../../form/build';
import { plainOptions } from '../../form/options';
import { CE_BLOCK_SOUNDS, CE_BLOCK_TAGS } from '../form/options';
import { ceBlockBehaviorDocs } from '../form/schema/docs';
import { type LogicType, logicCatalog, type LogicTypeSpec } from './catalog';
import { particleFields } from './particles';
import { conditionList, numberProvider } from './shared';

/** Keys several behaviors share, with one set of messages (`logic.shared.blockBehavior.<key>`, with a help text) */
const common = <S extends FieldSpec>(key: string, spec: S): S =>
  ({ ...spec, scope: `logic.shared.blockBehavior.${keySegment(key)}`, help: true }) as S;

const bool = (defaultHint: boolean) => field.boolean({ defaultHint });
const int = (min?: number, max?: number) =>
  field.number({ integer: true, ...(min !== undefined && { min }), ...(max !== undefined && { max }) });
const decimal = (min?: number, max?: number) =>
  field.number({ step: 0.01, ...(min !== undefined && { min }), ...(max !== undefined && { max }) });
const lightLevel = () => int(0, 15);
const id = () => field.text({ format: 'resource', placeholder: true });
/** A block id or a full block state (`default:my_block[age=1]`) */
const blockState = () => field.text({ placeholder: true });
const vector = () => field.text({ format: 'vector', placeholder: true });
/** Vanilla features a sapling (configured) or a grass block (placed) can grow; any other id can be typed in */
const VANILLA_FEATURES = {
  configuredFeatures: ['oak', 'birch', 'spruce', 'jungle_tree', 'acacia', 'dark_oak', 'cherry', 'mangrove', 'pale_oak'],
  placedFeatures: ['grass_bonemeal'],
};
/** A worldgen feature id, with vanilla ones and the project's configured or placed features as suggestions */
const featureId = (suggestions: keyof typeof VANILLA_FEATURES) =>
  field.select(plainOptions(VANILLA_FEATURES[suggestions].map((name) => `minecraft:${name}`)), {
    allowCustom: true,
    dynamicSuggestions: suggestions,
    placeholder: true,
    help: true,
  });

/**
 * A sound: its id, or an object with id, volume and pitch (a number or a range like `0.9~1`).
 * Shared by every behavior's sounds (`logic.shared.sound`).
 */
function sound(): FieldSpec {
  const soundId = () => field.text({ format: 'resource', suggestions: CE_BLOCK_SOUNDS });
  return field.choice(
    {
      id: { field: soundId(), matches: (value) => typeof value === 'string', newValue: () => '' },
      detailed: {
        field: field.object({ id: soundId(), volume: numberProvider(), pitch: numberProvider() }),
        matches: isPlainObject,
        newValue: () => ({ id: '' }),
      },
    },
    { scope: 'logic.shared.sound', help: true },
  );
}

/** The `sounds` of a behavior with these events (`open`, `close` …) */
const sounds = (...events: string[]) => common('sounds', field.object(Object.fromEntries(events.map((event) => [event, sound()]))));

/** The blocks (ids or states) and block tags a block may (or, as a blacklist, may not) stand on, hang from … */
const supportBlocks = (prefix: string): FieldSpecs => ({
  [`${prefix}_blocks`]: common(`${prefix}_blocks`, field.stringList({ placeholder: true })),
  [`${prefix}_block_tags`]: common(`${prefix}_block_tags`, field.stringList({ format: 'resource', suggestions: CE_BLOCK_TAGS })),
});

/** The keys of the support behaviors (bush, hanging, sturdy base, near/on liquid) */
const blacklist = (defaultHint: boolean) => common('blacklist', bool(defaultHint));
const stackable = () => common('stackable', bool(false));
const maxHeight = () => common('max_height', int(0));
const delay = () => common('delay', int(0));
const lightRequirement = () => common('light_requirement', lightLevel());
const maxLightRequirement = () => common('max_light_requirement', lightLevel());
const growSpeed = () => common('grow_speed', decimal(0));
const liquidType = () => common('liquid_type', field.stringList({ singleAsString: true, suggestions: plainOptions(['water', 'lava']) }));
const excludedProperties = () => common('excluded_properties', field.stringList());
const growthDirection = () => common('direction', field.select(plainOptions(['up', 'down'])));

/** Doors, trapdoors and fence gates */
const openable = (): FieldSpecs => ({
  can_open_with_hand: common('can_open_with_hand', bool(true)),
  can_open_by_wind_charge: common('can_open_by_wind_charge', bool(true)),
  sounds: sounds('open', 'close'),
});

/** Block entities that keep data and give a comparator signal */
const dataKey = () => common('data_key', field.text({ placeholder: true }));
const hasSignal = () => common('has_signal', bool(true));
const hopper = (): FieldSpecs => ({ allow_input: common('allow_input', bool(true)), allow_output: common('allow_output', bool(true)) });

/** The particles a block shows every `tick_interval` ticks */
const particles = (): FieldSpecs => ({
  tick_interval: common('tick_interval', int(1)),
  particles: common(
    'particles',
    field.objectList(particleFields(), { titleKey: 'particle', newItem: () => ({ particle: 'minecraft:flame' }) }),
  ),
});

/** What bone meal does to a vine crop: ripen berries, or grow it by `grow_blocks` blocks */
const boneMeal = () =>
  common(
    'bone_meal',
    field.object({
      behavior: field.select(plainOptions(['berries', 'grow'])),
      grow_blocks: { ...numberProvider(), showIf: { key: 'behavior', values: ['grow'] } },
    }),
  );

/** A behavior type with its keys, linked to its wiki page */
const behavior = (type: string, fields: FieldSpecs = {}): LogicTypeSpec => ({ type, fields, docs: ceBlockBehaviorDocs(type) });

/** A key only the plugin source reads (the wiki does not document it yet) */
const advanced = <S extends FieldSpec>(spec: S): S => ({ ...spec, advanced: true });

const SPECS: LogicTypeSpec[] = [
  // Shapes and building blocks
  behavior('slab_block'),
  behavior('stairs_block'),
  behavior('door_block', openable()),
  behavior('trapdoor_block', openable()),
  behavior('fence_gate_block', openable()),
  behavior('fence_block', {
    connectable_block_tag: field.text({ format: 'resource', suggestions: CE_BLOCK_TAGS, placeholder: true, help: true }),
    can_leash: { ...bool(false), help: true },
  }),
  behavior('sofa_block'),
  behavior('double_high_block'),
  behavior('multi_high_block', { property: field.text({ placeholder: true, help: true }) }),
  behavior('stackable_block', { property: field.text({ placeholder: true, help: true }), items: field.stringList({ format: 'resource' }) }),
  behavior('snowy_block'),
  behavior('hangable_block'),
  behavior('strippable_block', {
    stripped: { ...blockState(), help: true },
    tools: field.stringList({ placeholder: true, help: true }),
    excluded_properties: excludedProperties(),
    sound: sound(),
  }),
  // Redstone and light
  behavior('button_block', {
    ticks_to_stay_pressed: int(1),
    can_be_activated_by_arrows: bool(true),
    sounds: sounds('on', 'off'),
  }),
  behavior('pressure_plate_block', {
    sensitivity: field.select(plainOptions(['all', 'mob', 'everything', 'mobs']), { help: true }),
    pressed_time: int(1),
    sounds: sounds('on', 'off'),
  }),
  behavior('lamp_block'),
  behavior('toggleable_lamp_block', { can_open_with_hand: { ...bool(false), help: true } }),
  // Block entities
  behavior('seat_block', { seats: field.stringList({ placeholder: true, help: true }) }),
  behavior('simple_storage_block', {
    title: field.text({ format: 'minimessage', placeholder: true }),
    rows: int(1, 6),
    has_signal: hasSignal(),
    ...hopper(),
    data_key: dataKey(),
    sounds: sounds('open', 'close'),
  }),
  behavior('drawer_block', {
    max_stacks: int(1),
    has_signal: hasSignal(),
    ...hopper(),
    item_position: vector(),
    text_position: vector(),
    item_scale: vector(),
    text_scale: vector(),
    data_key: dataKey(),
    compatible_mode: { ...bool(false), help: true },
    sounds: sounds('put', 'take'),
  }),
  behavior('display_item_block', {
    position: vector(),
    has_signal: hasSignal(),
    tint_source: { ...bool(false), help: true },
    data_key: dataKey(),
    sounds: sounds('put', 'take'),
  }),
  behavior('item_frame_block', {
    position: vector(),
    glow: bool(false),
    invisible: bool(false),
    render_map_item: bool(true),
    data_key: dataKey(),
    sounds: sounds('put', 'take', 'rotate'),
  }),
  behavior('tint_source_block', { drop_item: { ...bool(true), help: true }, data_key: dataKey() }),
  behavior('simple_particle_block', particles()),
  behavior('wall_torch_particle_block', particles()),
  // Physics
  behavior('falling_block', { hurt_amount: { ...decimal(), help: true }, max_hurt: int(), sounds: sounds('land', 'destroy') }),
  behavior('concrete_powder_block', { solid_block: { ...blockState(), help: true } }),
  behavior('bouncing_block', {
    bounce_height: { ...decimal(0), help: true },
    fall_damage_multiplier: decimal(0),
    sync_player_position: bool(true),
  }),
  behavior('chime_block', { sounds: sounds('chime') }),
  {
    ...behavior('drop_exp_block', { amount: { ...numberProvider(), help: true }, conditions: conditionList('logic.shared.conditions') }),
    aliases: ['drop_experience_block'],
  },
  // Support: where the block can stand
  behavior('bush_block', {
    blacklist: blacklist(false),
    stackable: stackable(),
    max_height: maxHeight(),
    delay: delay(),
    ...supportBlocks('bottom'),
  }),
  behavior('hanging_block', {
    blacklist: blacklist(false),
    stackable: stackable(),
    max_height: maxHeight(),
    delay: delay(),
    ...supportBlocks('above'),
  }),
  behavior('sturdy_base_block', {
    direction: field.select(plainOptions(['down', 'up', 'north', 'south', 'west', 'east']), { help: true }),
    support_types: field.stringList({ suggestions: plainOptions(['full', 'rigid', 'center']), help: true }),
    stackable: stackable(),
    max_height: maxHeight(),
    delay: delay(),
  }),
  behavior('directional_attached_block', { blacklist: blacklist(true), ...supportBlocks('attached') }),
  behavior('face_attached_horizontal_directional_block', { blacklist: blacklist(true), ...supportBlocks('attached') }),
  behavior('liquid_flowable_block', { drop_item: { ...bool(true), help: true } }),
  behavior('near_liquid_block', {
    liquid_type: liquidType(),
    positions: field.stringList({ placeholder: true, help: true }),
    stackable: stackable(),
    delay: delay(),
  }),
  behavior('on_liquid_block', { liquid_type: liquidType(), stackable: stackable(), delay: delay() }),
  behavior('seagrass_like_block'),
  // Plants
  behavior('crop_block', {
    grow_speed: growSpeed(),
    light_requirement: lightRequirement(),
    max_light_requirement: maxLightRequirement(),
    spawn_light_requirement: { ...lightLevel(), help: true },
    max_spawn_light_requirement: lightLevel(),
    is_bone_meal_target: bool(true),
    bone_meal_age_bonus: { ...numberProvider(), help: true },
  }),
  behavior('sapling_block', {
    feature: featureId('configuredFeatures'),
    structure: { ...id(), help: true },
    light_requirement: lightRequirement(),
    max_light_requirement: maxLightRequirement(),
    grow_speed: growSpeed(),
    bone_meal_success_chance: decimal(0, 1),
  }),
  behavior('stem_block', {
    fruit: id(),
    attached_stem: { ...id(), help: true },
    light_requirement: lightRequirement(),
    max_light_requirement: maxLightRequirement(),
    ...supportBlocks('fruit_bottom'),
  }),
  behavior('attached_stem_block', { fruit: id(), stem: { ...id(), help: true } }),
  behavior('vertical_crop_block', { max_height: maxHeight(), grow_speed: growSpeed(), direction: growthDirection() }),
  behavior('vine_crop_head_block', {
    body: { ...id(), help: true },
    max_height: advanced(maxHeight()),
    grow_speed: advanced(growSpeed()),
    direction: advanced(growthDirection()),
    delay: advanced(delay()),
    bone_meal: advanced(boneMeal()),
  }),
  behavior('vine_crop_body_block', {
    head: { ...id(), help: true },
    direction: advanced(growthDirection()),
    delay: advanced(delay()),
    bone_meal: advanced(boneMeal()),
  }),
  behavior('budding_block', { growth_chance: decimal(0, 1), blocks: { ...field.stringList({ format: 'resource' }), help: true } }),
  behavior('decay_block', {
    decay_into: blockState(),
    delay: { ...numberProvider(), help: true },
    chance: numberProvider(),
    required_light: lightLevel(),
  }),
  behavior('change_over_time_block', {
    change_speed: decimal(0, 1),
    next_block: { ...blockState(), help: true },
    excluded_properties: excludedProperties(),
  }),
  behavior('spreading_block', { target_block: { ...blockState(), help: true } }),
  behavior('surface_spreading_block', {
    light_requirement: lightRequirement(),
    max_light_requirement: maxLightRequirement(),
    base_block: { ...blockState(), help: true },
  }),
  behavior('grass_block', { feature: featureId('placedFeatures') }),
  behavior('leaves_block'),
];

/** The catalog categories (`logic.categories.blockBehaviors.<camel(category)>`) and the behaviors listed under each */
const CATEGORIES: Record<string, string[]> = {
  shapes: [
    'slab_block',
    'stairs_block',
    'door_block',
    'trapdoor_block',
    'fence_gate_block',
    'fence_block',
    'sofa_block',
    'double_high_block',
    'multi_high_block',
    'stackable_block',
    'snowy_block',
    'hangable_block',
    'strippable_block',
  ],
  redstone: ['button_block', 'pressure_plate_block', 'lamp_block', 'toggleable_lamp_block'],
  blockEntities: [
    'seat_block',
    'simple_storage_block',
    'drawer_block',
    'display_item_block',
    'item_frame_block',
    'tint_source_block',
    'simple_particle_block',
    'wall_torch_particle_block',
  ],
  physics: ['falling_block', 'concrete_powder_block', 'bouncing_block', 'chime_block', 'drop_exp_block'],
  placement: [
    'bush_block',
    'hanging_block',
    'sturdy_base_block',
    'directional_attached_block',
    'face_attached_horizontal_directional_block',
    'liquid_flowable_block',
    'near_liquid_block',
    'on_liquid_block',
    'seagrass_like_block',
  ],
  plants: [
    'crop_block',
    'sapling_block',
    'stem_block',
    'attached_stem_block',
    'vertical_crop_block',
    'vine_crop_head_block',
    'vine_crop_body_block',
    'budding_block',
    'decay_block',
    'change_over_time_block',
    'spreading_block',
    'surface_spreading_block',
    'grass_block',
    'leaves_block',
  ],
};

const CATEGORY_OF = new Map(Object.entries(CATEGORIES).flatMap(([category, types]) => types.map((type) => [type, category] as const)));

const TYPES = logicCatalog(
  'blockBehaviors',
  SPECS.map((spec): LogicTypeSpec => {
    const category = CATEGORY_OF.get(spec.type);
    return category ? { ...spec, category } : spec;
  }),
);

/** The block behavior types; `drop_experience_block` is the plugin's second name of `drop_exp_block`. */
export const CE_BLOCK_BEHAVIORS: LogicType[] = TYPES.flatMap((type) =>
  type.type === 'drop_exp_block' ? [type, { ...type, type: 'drop_experience_block', aliases: ['drop_exp_block'] }] : [type],
);
