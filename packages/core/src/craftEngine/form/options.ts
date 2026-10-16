/**
 * Option lists for the CraftEngine configuration. All lists are suggestions unless a select field allows no custom
 * values. CraftEngine writes vanilla ids in lowercase (`minecraft:sharpness`, `attack_speed`), so the vanilla data
 * from minecraft/catalog is turned into that spelling here.
 */
import { ATTRIBUTE_NAMES, COMPONENT_NAMES, ENCHANTMENT_NAMES, ITEM_TAG_NAMES, SOUND_EVENTS } from '@resourcepackbuilder/minecraft';
import { plainOptions } from '../../form/options';

/** Vanilla attributes (`attack_damage`). */
export const CE_ATTRIBUTES = plainOptions(ATTRIBUTE_NAMES.map((name) => name.toLowerCase()));

/** Vanilla attribute modifier operations. */
export const CE_ATTRIBUTE_OPERATIONS = plainOptions(['add_value', 'add_multiplied_base', 'add_multiplied_total']);

/** Vanilla equipment slot groups of attribute modifiers. */
export const CE_ATTRIBUTE_SLOTS = plainOptions([
  'any',
  'hand',
  'mainhand',
  'offhand',
  'armor',
  'head',
  'chest',
  'legs',
  'feet',
  'body',
  'saddle',
]);

/** Equipment slots of `equippable` and `settings.equipment`. */
export const CE_EQUIPMENT_SLOTS = plainOptions(['head', 'chest', 'legs', 'feet', 'body', 'mainhand', 'offhand', 'saddle']);

/** Vanilla enchantments (`minecraft:sharpness`). */
export const CE_ENCHANTMENTS = plainOptions(ENCHANTMENT_NAMES.map((name) => `minecraft:${name}`));

/** Vanilla data components (`minecraft:food`). */
export const CE_COMPONENTS = plainOptions(COMPONENT_NAMES);

/** Vanilla item tags (`minecraft:pickaxes`). */
export const CE_ITEM_TAGS = plainOptions(ITEM_TAG_NAMES.map((name) => `minecraft:${name}`));

/** Vanilla armor trim patterns. */
export const CE_TRIM_PATTERNS = plainOptions([
  'bolt',
  'coast',
  'dune',
  'eye',
  'flow',
  'host',
  'raiser',
  'rib',
  'sentry',
  'shaper',
  'silence',
  'snout',
  'spire',
  'tide',
  'vex',
  'ward',
  'wayfinder',
  'wild',
]);

/** Vanilla armor trim materials. */
export const CE_TRIM_MATERIALS = plainOptions([
  'amethyst',
  'copper',
  'diamond',
  'emerald',
  'gold',
  'iron',
  'lapis',
  'netherite',
  'quartz',
  'redstone',
  'resin',
]);

/** Where `insert_lore` adds its lines. */
export const CE_LORE_POSITIONS = plainOptions(['HEAD', 'TAIL', 'BEFORE', 'AFTER']);

/** Damage causes a dropped item can be immune to (`settings.invulnerable`). */
export const CE_DAMAGE_CAUSES = plainOptions(['lava', 'fire', 'fire_tick', 'block_explosion', 'entity_explosion', 'lightning', 'contact']);

/** Team colors of a dropped item's glow (`settings.glow_color`). */
export const CE_GLOW_COLORS = plainOptions([
  'black',
  'dark_blue',
  'dark_green',
  'dark_aqua',
  'dark_red',
  'dark_purple',
  'gold',
  'gray',
  'dark_gray',
  'blue',
  'green',
  'aqua',
  'red',
  'light_purple',
  'yellow',
  'white',
]);

/** Block sound events (`minecraft:block.stone.break` …) for a block's `settings.sounds`. */
export const CE_BLOCK_SOUNDS = plainOptions(SOUND_EVENTS.filter((name) => name.startsWith('block.')).map((name) => `minecraft:${name}`));

/** Common vanilla block tags: the tool that mines the block fast, the tool tier it needs, and block families. */
export const CE_BLOCK_TAGS = plainOptions(
  [
    'mineable/pickaxe',
    'mineable/axe',
    'mineable/shovel',
    'mineable/hoe',
    'needs_stone_tool',
    'needs_iron_tool',
    'needs_diamond_tool',
    'sword_efficient',
    'logs',
    'logs_that_burn',
    'planks',
    'leaves',
    'saplings',
    'flowers',
    'crops',
    'dirt',
    'replaceable',
    'replaceable_by_trees',
    'beacon_base_blocks',
    'climbable',
  ].map((name) => `minecraft:${name}`),
);

/** How pistons treat the block (`settings.push_reaction`), in the names of Minecraft 26.3; CraftEngine maps them on older servers. */
export const CE_PUSH_REACTIONS = plainOptions(['PUSH_PULL', 'PUSH', 'POPPED', 'IMMOVEABLE', 'IGNORE_ENTITY']);

/** The note block sound when a note block sits on the block (`settings.instrument`). */
export const CE_INSTRUMENTS = plainOptions([
  'harp',
  'basedrum',
  'snare',
  'hat',
  'bass',
  'flute',
  'bell',
  'guitar',
  'chime',
  'xylophone',
  'iron_xylophone',
  'cow_bell',
  'didgeridoo',
  'bit',
  'banjo',
  'pling',
]);
