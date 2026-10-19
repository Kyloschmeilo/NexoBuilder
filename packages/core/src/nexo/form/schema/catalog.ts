/**
 * Catalog metadata of the Nexo properties: the category each one is sorted into in the "Add feature" catalog, the
 * common ones offered first, and search aliases. Category names live at `groups.<group>.categories.<category>` in the
 * `schema` namespace.
 */
import { catalogTable, type PropertyCatalog } from '../../../form/catalogMeta';

const GENERAL = catalogTable(
  {
    text: ['lore', 'customname'],
    item: ['unbreakable', 'ItemFlags', 'PersistentData', 'template'],
    nexo: ['excludeFromInventory', 'excludeFromCommands', 'injectId', 'no_auto_update'],
  },
  ['lore', 'unbreakable'],
  {
    lore: ['description', 'tooltip text'],
    customname: ['name', 'rename'],
    ItemFlags: ['hide flags', 'hide attributes'],
    PersistentData: ['pdc', 'nbt', 'custom data'],
    template: ['inherit', 'parent'],
    unbreakable: ['durability', 'indestructible'],
  },
);

const APPEARANCE = catalogTable(
  {
    model: [
      'Components.item_model',
      'Pack.custom_model_data',
      'Pack.oversized_in_gui',
      'Pack.hand_swap_animation',
      'Pack.swap_animation_scale',
    ],
    colors: ['color', 'trim_pattern', 'trim_material'],
    armor: ['armor'],
  },
  ['color', 'armor'],
  {
    color: ['dye', 'tint', 'leather'],
    armor: ['custom armor', 'armor texture', 'elytra', 'wings'],
    'Pack.custom_model_data': ['cmd'],
    'Components.item_model': ['model id'],
    trim_pattern: ['armor trim'],
    trim_material: ['armor trim'],
  },
);

const ATTRIBUTES = catalogTable(
  {
    modifiers: ['AttributeModifiers'],
    enchantments: ['Enchantments', 'StoredEnchantments'],
    effects: ['PotionEffects'],
  },
  ['AttributeModifiers', 'Enchantments'],
  {
    AttributeModifiers: ['attack damage', 'attack speed', 'health', 'armor points', 'movement speed'],
    Enchantments: ['sharpness', 'unbreaking', 'efficiency'],
    StoredEnchantments: ['enchanted book'],
    PotionEffects: ['potion', 'effect'],
  },
);

const COMPONENTS = catalogTable(
  {
    foodUse: [
      'Components.food',
      'Components.consumable',
      'Components.use_remainder',
      'Components.use_cooldown',
      'Components.use_effects',
      'Components.death_protection',
      'Components.jukebox_playable',
      'Components.instrument',
      'Components.compostable',
      'Components.cooking_fuel',
      'Components.brewing_fuel',
    ],
    combat: [
      'Components.tool',
      'Components.weapon',
      'Components.max_damage',
      'Components.enchantable',
      'Components.repairable',
      'Components.blocks_attacks',
      'Components.attack_range',
      'Components.piercing_weapon',
      'Components.kinetic_weapon',
      'Components.damage_type',
      'Components.minimum_attack_charge',
    ],
    tooltip: ['Components.hide_tooltip', 'Components.tooltip_display', 'Components.tooltip_style', 'Components.rarity'],
    equipment: ['Components.equippable', 'Components.glider', 'Components.damage_resistant'],
    appearance: [
      'Components.enchantment_glint_override',
      'Components.custom_model_data',
      'Components.profile',
      'Components.painting_variant',
      'Components.swing_animation',
      'Components.attack_animation',
      'Components.interact_animation',
      'Components.break_sound',
    ],
    behavior: [
      'Components.max_stack_size',
      'Components.fire_resistant',
      'Components.can_place_on',
      'Components.can_break',
      'Components.custom_data',
      'Components.unset_components',
    ],
  },
  [
    'Components.max_stack_size',
    'Components.max_damage',
    'Components.food',
    'Components.consumable',
    'Components.tool',
    'Components.equippable',
    'Components.enchantment_glint_override',
    'Components.fire_resistant',
  ],
  {
    'Components.max_stack_size': ['stack size', 'stackable'],
    'Components.max_damage': ['durability', 'uses'],
    'Components.enchantment_glint_override': ['glint', 'shine', 'enchanted glow'],
    'Components.fire_resistant': ['lava', 'burn'],
    'Components.hide_tooltip': ['hide lore'],
    'Components.tooltip_style': ['tooltip texture'],
    'Components.food': ['eat', 'hunger', 'nutrition'],
    'Components.consumable': ['eat', 'drink', 'use time'],
    'Components.use_cooldown': ['cooldown'],
    'Components.tool': ['mining speed', 'pickaxe', 'axe', 'shovel'],
    'Components.weapon': ['sword', 'attack'],
    'Components.equippable': ['armor', 'wear', 'helmet', 'slot', 'hat'],
    'Components.glider': ['elytra', 'fly', 'wings'],
    'Components.damage_resistant': ['immune', 'fire damage'],
    'Components.enchantable': ['enchantability'],
    'Components.repairable': ['anvil repair'],
    'Components.death_protection': ['totem'],
    'Components.jukebox_playable': ['music disc', 'record'],
    'Components.custom_model_data': ['cmd'],
    'Components.profile': ['player head', 'skull'],
    'Components.blocks_attacks': ['shield'],
    'Components.rarity': ['name color'],
    'Components.compostable': ['composter'],
    'Components.cooking_fuel': ['furnace fuel', 'burn time'],
    'Components.can_place_on': ['adventure mode'],
    'Components.can_break': ['adventure mode'],
  },
);

const MECHANICS = catalogTable(
  {
    placement: ['Mechanics.furniture', 'Mechanics.custom_block'],
    actions: ['Mechanics.commands', 'Mechanics.custom', 'Mechanics.backpack', 'Mechanics.trident'],
    tools: ['Mechanics.harvesting', 'Mechanics.smelting', 'Mechanics.repair'],
    wearables: ['Mechanics.armor_effects', 'Mechanics.soulbound'],
    misc: ['Mechanics.misc', 'Mechanics.itemtype'],
  },
  ['Mechanics.furniture', 'Mechanics.custom_block', 'Mechanics.commands'],
  {
    'Mechanics.furniture': ['decoration', 'chair', 'seat', 'place'],
    'Mechanics.custom_block': ['block', 'note block', 'place'],
    'Mechanics.commands': ['run command', 'click'],
    'Mechanics.custom': ['event', 'trigger'],
    'Mechanics.backpack': ['bag', 'storage', 'inventory'],
    'Mechanics.trident': ['throw', 'spear'],
    'Mechanics.harvesting': ['crops', 'farm'],
    'Mechanics.smelting': ['auto smelt', 'ore'],
    'Mechanics.repair': ['mending', 'fix'],
    'Mechanics.armor_effects': ['potion', 'effect'],
    'Mechanics.soulbound': ['keep on death'],
    'Mechanics.misc': ['prevent renaming', 'compostable'],
  },
);

/** Categories, common entries and aliases of every Nexo property, by property id. */
export const NEXO_CATALOG: PropertyCatalog = { ...GENERAL, ...APPEARANCE, ...ATTRIBUTES, ...COMPONENTS, ...MECHANICS };
