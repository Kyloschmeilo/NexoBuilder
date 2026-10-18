/**
 * Catalog metadata of the CraftEngine item properties (general, data and settings): the category each one is sorted
 * into in the "Add feature" catalog, the common ones offered first, and search aliases. Category names live at
 * `groups.<group>.categories.<category>` in the `ceSchema` namespace.
 */
import { catalogTable, type PropertyCatalog } from '../../../form/catalogMeta';

const GENERAL = catalogTable(
  {
    text: ['data.lore', 'data.custom_name', 'translations', 'data.hide_tooltip'],
    item: ['data.unbreakable', 'data.pdc', 'category', 'client_bound_material'],
    templates: ['template', 'overrides', 'merges', 'arguments'],
  },
  ['data.lore', 'data.unbreakable'],
  {
    'data.lore': ['description', 'tooltip text'],
    'data.custom_name': ['name', 'rename'],
    translations: ['language', 'i18n'],
    'data.pdc': ['persistent data', 'nbt'],
    'data.unbreakable': ['durability', 'indestructible'],
    template: ['inherit', 'parent'],
  },
);

const DATA = catalogTable(
  {
    text: ['data.insert_lore', 'data.remove_lore', 'data.dynamic_lore', 'data.tooltip_style', 'data.written_book_content'],
    appearance: ['data.dyed_color', 'data.trim', 'data.custom_model_data', 'data.item_model', 'data.profile', 'data.painting_variant'],
    foodUse: ['data.food', 'data.use_remainder', 'data.jukebox_playable'],
    combat: ['data.equippable', 'data.max_damage', 'data.attribute_modifiers', 'data.enchantment'],
    components: [
      'data.block_state',
      'data.random_values',
      'data.functions',
      'data.tags',
      'data.external',
      'data.components',
      'data.remove_components',
      'updater',
      'client_bound_data',
    ],
  },
  ['data.food', 'data.equippable', 'data.max_damage', 'data.attribute_modifiers', 'data.enchantment', 'data.custom_model_data'],
  {
    'data.food': ['eat', 'hunger', 'nutrition'],
    'data.equippable': ['armor', 'wear', 'helmet', 'slot'],
    'data.max_damage': ['durability', 'uses'],
    'data.attribute_modifiers': ['attack damage', 'attack speed', 'health'],
    'data.enchantment': ['sharpness', 'unbreaking'],
    'data.dyed_color': ['dye', 'leather', 'color'],
    'data.trim': ['armor trim'],
    'data.custom_model_data': ['cmd'],
    'data.profile': ['player head', 'skull'],
    'data.jukebox_playable': ['music disc', 'record'],
    'data.insert_lore': ['description'],
    'data.components': ['vanilla component'],
    'data.tags': ['nbt'],
  },
);

const SETTINGS = catalogTable(
  {
    behavior: [
      'settings.tags',
      'settings.renameable',
      'settings.can_place',
      'settings.disable_vanilla_behavior',
      'settings.invulnerable',
      'settings.keep_on_death_chance',
      'settings.destroy_on_death_chance',
      'settings.trigger_advancement',
      'settings.allowed_projectiles',
      'settings.projectile',
      'settings.food',
    ],
    crafting: [
      'settings.fuel_time',
      'settings.fuel_remainder',
      'settings.craft_remainder',
      'settings.consume_replacement',
      'settings.ingredient_substitute',
      'settings.compost_probability',
    ],
    repair: [
      'settings.break_power',
      'settings.repairable',
      'settings.anvil_repair_item',
      'settings.drag_repair_item',
      'settings.anvil_repair_material',
      'settings.drag_repair_material',
      'settings.respect_repairable_component',
      'settings.enchantable',
      'settings.prevent_break',
    ],
    equipment: [
      'settings.equipment',
      'armor',
      'settings.equipment_lod',
      'settings.equipment_potion_effects',
      'settings.equipment_set_part',
      'settings.hat_height',
      'settings.attribute_modifiers',
    ],
    appearance: ['settings.dyeable', 'settings.dye_color', 'settings.firework_color', 'settings.glow_color', 'settings.drop_display'],
  },
  ['settings.tags', 'settings.fuel_time', 'settings.equipment', 'settings.repairable', 'settings.enchantable', 'armor'],
  {
    'settings.tags': ['item tag', 'group'],
    'settings.fuel_time': ['furnace', 'burn time', 'fuel'],
    'settings.repairable': ['anvil', 'mending'],
    'settings.anvil_repair_item': ['anvil'],
    'settings.equipment': ['armor', 'wear', 'texture'],
    armor: ['custom armor', 'armor texture', 'elytra'],
    'settings.invulnerable': ['fire', 'lava', 'explosion'],
    'settings.glow_color': ['outline'],
    'settings.hat_height': ['head', 'helmet'],
    'settings.prevent_break': ['durability'],
  },
);

/** Categories, common entries and aliases of the CraftEngine general, data and settings properties, by property id. */
export const CE_CATALOG: PropertyCatalog = { ...GENERAL, ...DATA, ...SETTINGS };
