/**
 * Option lists for the Nexo configuration. All lists are suggestions –
 * custom values can also be entered in the fields. Vanilla Minecraft data comes from
 * minecraft/catalog; this module turns it into options and holds the Nexo-specific lists.
 */
import {
  ATTRIBUTE_NAMES,
  BASE_MATERIALS,
  COMPONENT_NAMES,
  CRAFTING_BLOCKS,
  DAMAGE_TYPE_TAG_NAMES,
  ENCHANTMENT_NAMES,
  ITEM_FLAG_NAMES,
  ITEM_TAG_NAMES,
  POTION_EFFECT_NAMES,
  SOUND_EVENTS,
} from '@resourcepackbuilder/minecraft';
import { labeledOptions, type Option, plainOptions } from '../../form/options';

/** Option lists of this module are labeled under `options.<list name>`. */
const labeled = (list: string, values: string[]): Option[] => labeledOptions(`options.${list}`, values);

/** Commonly used base materials (Bukkit material names). */
export const MATERIALS = plainOptions(BASE_MATERIALS);

/** Attributes (Paper org.bukkit.attribute.Attribute, spelled as in the Nexo docs). */
export const ATTRIBUTES = plainOptions(ATTRIBUTE_NAMES);

export const ATTRIBUTE_OPERATIONS = labeled('attributeOperations', ['ADD_NUMBER', 'ADD_SCALAR', 'MULTIPLY_SCALAR_1']);

/** EquipmentSlotGroup */
export const ATTRIBUTE_SLOTS = labeled('attributeSlots', [
  'ANY',
  'MAINHAND',
  'OFFHAND',
  'HAND',
  'HEAD',
  'CHEST',
  'LEGS',
  'FEET',
  'ARMOR',
  'BODY',
  'SADDLE',
]);

export const EQUIPPABLE_SLOTS = plainOptions(['HEAD', 'CHEST', 'LEGS', 'FEET', 'BODY', 'MAINHAND', 'OFFHAND', 'SADDLE']);

/** Item flags (Bukkit ItemFlag). */
export const ITEM_FLAGS = plainOptions(ITEM_FLAG_NAMES);

/** Enchantments (vanilla registry names). */
export const ENCHANTMENTS = plainOptions(ENCHANTMENT_NAMES);

/** Potion effects (Bukkit PotionEffectType). */
export const POTION_EFFECTS = plainOptions(POTION_EFFECT_NAMES);

export const CONSUME_ANIMATIONS = plainOptions([
  'EAT',
  'DRINK',
  'NONE',
  'BLOCK',
  'BOW',
  'SPEAR',
  'TRIDENT',
  'CROSSBOW',
  'SPYGLASS',
  'TOOT_HORN',
  'BRUSH',
  'BUNDLE',
]);

export const SWING_ANIMATIONS = plainOptions(['WHACK', 'STAB', 'NONE']);

export const PERSISTENT_DATA_TYPES = plainOptions([
  'STRING',
  'INTEGER',
  'LONG',
  'DOUBLE',
  'FLOAT',
  'SHORT',
  'BYTE',
  'BOOLEAN',
  'INTEGER_ARRAY',
  'LONG_ARRAY',
  'BYTE_ARRAY',
  'UUID',
]);

export const DISPLAY_TRANSFORMS = plainOptions([
  'NONE',
  'FIXED',
  'HEAD',
  'GUI',
  'GROUND',
  'THIRDPERSON_LEFTHAND',
  'THIRDPERSON_RIGHTHAND',
  'FIRSTPERSON_LEFTHAND',
  'FIRSTPERSON_RIGHTHAND',
]);

export const TRACKING_ROTATIONS = labeled('trackingRotations', ['FIXED', 'VERTICAL', 'HORIZONTAL', 'CENTER']);

export const TOOL_TIERS = plainOptions(['WOODEN', 'STONE', 'IRON', 'GOLDEN', 'DIAMOND', 'NETHERITE']);
export const TOOL_TYPES = plainOptions(['PICKAXE', 'AXE', 'SHOVEL', 'HOE', 'SWORD']);

/** Storage types; SHULKER is read by Nexo 1.30 but not in its docs yet. */
export const STORAGE_TYPES = labeled('storageTypes', ['STORAGE', 'PERSONAL', 'ENDERCHEST', 'DISPOSAL', 'SHULKER']);

export const CUSTOM_BLOCK_TYPES = labeled('customBlockTypes', ['NOTEBLOCK', 'STRINGBLOCK', 'CHORUSBLOCK']);

/** The custom block types of the Carpentry addon, offered when the project has it (see ../carpentry.ts). */
export const CARPENTRY_BLOCK_TYPE_OPTIONS = labeled('customBlockTypes', [
  'STAIR',
  'SLAB',
  'DOOR',
  'TRAPDOOR',
  'GRATE',
  'CHAIN',
  'LANTERN',
  'BARS',
]);

/** Furniture `properties.cullable`: whether the client may cull the furniture (NOT_SET leaves it to Nexo). */
export const CULLABLE_STATES = labeled('cullableStates', ['TRUE', 'FALSE', 'NOT_SET']);

export const BLOCKLOCKER_TYPES = plainOptions(['CONTAINER', 'DOOR', 'ATTACHABLE']);

export const CUSTOM_EVENTS = labeled('customEvents', [
  'CLICK:right:all',
  'CLICK:right:block',
  'CLICK:right:air',
  'CLICK:left:all',
  'CLICK:left:block',
  'CLICK:left:air',
  'CLICK:all:all',
  'INV_CLICK:all:all',
  'INV_CLICK:right:all',
  'INV_CLICK:right:shift',
  'INV_CLICK:left:all',
  'INV_CLICK:left:shift',
  'INV_CLICK:middle:all',
  'DROP',
  'PICKUP',
  'BREAK',
  'EQUIP',
  'UNEQUIP',
  'DEATH',
  'DROP_ALL',
]);

/** Note block instrument sounds a NoteBlock can play (Mechanics.custom_block.instrument, Nexo default: bass). */
export const NOTEBLOCK_INSTRUMENTS = plainOptions(
  [
    'harp',
    'bass',
    'basedrum',
    'snare',
    'hat',
    'bell',
    'flute',
    'chime',
    'guitar',
    'xylophone',
    'iron_xylophone',
    'cow_bell',
    'didgeridoo',
    'bit',
    'banjo',
    'pling',
  ].map((instrument) => `block.note_block.${instrument}`),
);

/** Common vanilla sound events. */
export const SOUND_SUGGESTIONS = plainOptions(SOUND_EVENTS);

/** Damage type tags. */
export const DAMAGE_TYPE_TAGS = plainOptions(DAMAGE_TYPE_TAG_NAMES);

/** Vanilla data components. */
export const VANILLA_COMPONENTS = plainOptions(COMPONENT_NAMES);

/** Suggestions for recipe ingredients (materials + common blocks). */
export const CRAFTING_MATERIALS: Option[] = plainOptions([...BASE_MATERIALS, ...CRAFTING_BLOCKS]);

/** Common item tags for recipes (without namespace = minecraft). */
export const ITEM_TAGS = plainOptions(ITEM_TAG_NAMES);
