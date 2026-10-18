/**
 * Links into the CraftEngine wiki: the pages of the item, block and project sections, and the section of each type of
 * the logic catalogs. Paths and heading anchors are those of the published wiki (a Docusaurus site, whose anchors
 * are the slugged heading texts); a type without a heading of its own links to its catalog's page.
 */
import type { LogicCatalogName } from '../../logic/catalog';
import type { MediaKind } from '../../../project/media/kinds';
import type { RecipeType } from '../../../project/recipes/model';

/** The wiki's base URL; every CraftEngine docs link starts with it. */
export const CE_WIKI_URL = 'https://xiao-momi.github.io/craft-engine-wiki/';

const WIKI = CE_WIKI_URL.slice(0, -1);

/** The CraftEngine wiki pages of the item, block and project sections and of the logic catalogs */
export const CE_DOCS = {
  data: `${WIKI}/configuration/item/data`,
  settings: `${WIKI}/configuration/item/settings`,
  itemBehaviors: `${WIKI}/configuration/item/behaviors`,
  updater: `${WIKI}/configuration/item/updater`,
  blockSettings: `${WIKI}/configuration/block/settings`,
  blockStates: `${WIKI}/configuration/block/states`,
  blockBehaviors: `${WIKI}/configuration/block/behaviors`,
  loot: `${WIKI}/reference/loot_table`,
  equipment: `${WIKI}/configuration/equipment`,
  equipmentComponent: `${WIKI}/configuration/equipment#component-based`,
  equipmentTrim: `${WIKI}/configuration/equipment#trim-based`,
  entityRenderer: `${WIKI}/configuration/block/states/entity_renderer`,
  furniture: `${WIKI}/configuration/furniture`,
  furnitureBehaviors: `${WIKI}/configuration/furniture/behaviors`,
  furnitureSettings: `${WIKI}/configuration/furniture/settings`,
  furnitureVariants: `${WIKI}/configuration/furniture/variants`,
  lang: `${WIKI}/configuration/translations`,
  events: `${WIKI}/reference/events`,
  conditions: `${WIKI}/reference/conditions`,
  functions: `${WIKI}/reference/functions`,
  numbers: `${WIKI}/reference/number_format`,
  lootSources: `${WIKI}/configuration/loot_source`,
  templates: `${WIKI}/reference/template`,
  globalVariables: `${WIKI}/configuration/global_variable`,
  attributes: `${WIKI}/configuration/attribute`,
  attributeDefinitions: `${WIKI}/configuration/attribute/definition`,
  attributeModifiers: `${WIKI}/configuration/attribute/modifier`,
  equipmentSets: `${WIKI}/configuration/attribute/equipment-set`,
  damageFormulas: `${WIKI}/configuration/attribute/damage-formula`,
  recipes: `${WIKI}/configuration/recipe`,
};

/** The wiki section of each recipe type CraftEngine reads (`dye` is only in the plugin source: the recipe types) */
export const CE_RECIPE_DOCS: Partial<Record<RecipeType, string>> = {
  shaped: `${CE_DOCS.recipes}#shaped-crafting-recipe`,
  shapeless: `${CE_DOCS.recipes}#shapeless-crafting-recipe`,
  furnace: `${CE_DOCS.recipes}#cooking-recipe`,
  blasting: `${CE_DOCS.recipes}#cooking-recipe`,
  smoking: `${CE_DOCS.recipes}#cooking-recipe`,
  campfire: `${CE_DOCS.recipes}#cooking-recipe`,
  stonecutting: `${CE_DOCS.recipes}#stone-cutting-recipe`,
  shaped_transform: `${CE_DOCS.recipes}#shaped-transform-recipe`,
  shapeless_transform: `${CE_DOCS.recipes}#shapeless-transform-recipe`,
  brewing: `${CE_DOCS.recipes}#brewing-recipe`,
  smithing_transform: `${CE_DOCS.recipes}#smithing-transform-recipe`,
  smithing_trim: `${CE_DOCS.recipes}#smithing-trim-recipe`,
  dye: `${CE_DOCS.recipes}#recipe-types`,
};

/** The wiki pages of the media sections: images (with emoji), sounds and paintings (CraftEngine has no dialogs) */
export const CE_MEDIA_DOCS: Partial<Record<MediaKind, string>> = {
  glyph: `${WIKI}/configuration/image`,
  sound: `${WIKI}/configuration/sound`,
  painting: `${WIKI}/configuration/painting`,
};

/** The wiki pages of emoji (a glyph's chat shortcuts) and of jukebox songs (a sound's music disc) */
export const CE_MEDIA_EXTRA_DOCS = {
  emoji: `${WIKI}/configuration/emoji`,
  emojiOverrides: `${WIKI}/configuration/emoji#context-specific-overrides`,
  jukeboxSongs: `${WIKI}/configuration/jukebox_song`,
};

/** The wiki page of a block behavior (`configuration/block/behaviors/<type>`). */
export const ceBlockBehaviorDocs = (type: string): string => `${CE_DOCS.blockBehaviors}/${type}`;

/** The wiki page of an item behavior (`configuration/item/behaviors/<type>`). */
export const ceItemBehaviorDocs = (type: string): string => `${CE_DOCS.itemBehaviors}/${type}`;

/** The section of an item setting on the settings page (`configuration/item/settings#<heading>`). */
export const ceItemSettingDocs = (heading: string): string => `${CE_DOCS.settings}#${heading}`;

/** Types whose heading on the catalog's page is the type itself */
const same = (...types: string[]): Record<string, string> => Object.fromEntries(types.map((type) => [type, type]));

/** The page of each logic catalog and the heading anchor of each type that has a section of its own there */
const LOGIC_DOCS: Record<LogicCatalogName, { page: string; anchors: Record<string, string> }> = {
  conditions: {
    page: CE_DOCS.conditions,
    anchors: {
      ...same(
        'all_of',
        'any_of',
        'inverted',
        'has_player',
        'has_item',
        'match_item',
        'equipment',
        'equipment_set',
        'match_entity',
        'match_block',
        'match_block_property',
        'match_furniture_variant',
        'table_bonus',
        'survives_explosion',
        'falling_block',
        'enchantment',
        'random',
        'distance',
        'permission',
        'has_discovered_recipe',
        'string_equals',
        'string_contains',
        'regex',
        'expression',
        'is_null',
        'hand',
        'on_cooldown',
        'inventory_has_item',
        'is_bedrock_player',
        'js',
        'has_money',
      ),
      on_item_cooldown: 'on_item_cooldown-1212',
      'worldguard:region': 'worldguardregion',
    },
  },
  functions: {
    page: CE_DOCS.functions,
    anchors: {
      ...same(
        'command',
        'message',
        'actionbar',
        'title',
        'toast',
        'open_window',
        'close_inventory',
        'merchant_trade',
        'play_sound',
        'particle',
        'potion_effect',
        'remove_potion_effect',
        'damage',
        'heal',
        'set_food',
        'set_saturation',
        'set_exp',
        'set_level',
        'leveler_exp',
        'teleport',
        'transfer',
        'set_cooldown',
        'remove_cooldown',
        'discover_recipe',
        'play_totem_animation',
        'swing_hand',
        'set_count',
        'damage_item',
        'clear_item',
        'drop_loot',
        'cancel_event',
        'run',
        'if_else',
        'when',
        'set_variable',
        'place_block',
        'break_block',
        'update_block_property',
        'transform_block',
        'cycle_block_property',
        'update_interaction_tick',
        'spawn_furniture',
        'replace_furniture',
        'remove_furniture',
        'rotate_furniture',
        'set_furniture_variant',
        'remove_entity',
        'js',
        'take_money',
        'give_money',
        'cast_mythic_skill',
        'spawn_mythic_mob',
      ),
      set_item_cooldown: 'set_item_cooldown-1212',
      // A second name of if_else
      alternatives: 'if_else',
    },
  },
  numbers: {
    page: CE_DOCS.numbers,
    anchors: {
      ...same('constant', 'uniform', 'expression', 'log_normal', 'skew_normal', 'binomial', 'weighted', 'triangle', 'exponential', 'beta'),
      normal: 'gaussian--normal',
      gaussian: 'gaussian--normal',
    },
  },
  // The events page has no section per trigger
  triggers: { page: CE_DOCS.events, anchors: {} },
  lootSources: {
    page: CE_DOCS.lootSources,
    anchors: same(
      'block_break',
      'entity_death',
      'fishing',
      'piglin_barter',
      'container',
      'archaeology',
      'entity_drop',
      'harvest',
      'block_shear',
      'entity_shear',
      'vault',
      'advancement',
    ),
  },
  lootEntries: {
    page: CE_DOCS.loot,
    // if_else is a second name of alternatives
    anchors: { ...same('item', 'furniture_item', 'exp', 'loot_table', 'alternatives'), if_else: 'alternatives' },
  },
  lootFunctions: {
    page: CE_DOCS.loot,
    anchors: same('set_count', 'apply_bonus', 'explosion_decay', 'limit_count', 'drop_exp', 'apply_data'),
  },
  attributeBases: {
    page: CE_DOCS.attributeDefinitions,
    anchors: {
      constant: 'fixed-value-constant',
      vanilla: 'entitys-current-vanilla-attribute-vanilla',
      by_entity_type: 'vanilla-default-for-the-entity-type-by_entity_type',
    },
  },
  attributeSyncValues: {
    page: CE_DOCS.attributeDefinitions,
    anchors: {
      expression: 'sync-synchronizing-with-vanilla-attributes',
      delta: 'sync-synchronizing-with-vanilla-attributes',
      ratio: 'sync-synchronizing-with-vanilla-attributes',
    },
  },
  damageFormulas: {
    page: CE_DOCS.damageFormulas,
    anchors: { expression: 'expression-expression-formulas', composition: 'composition-formula-parts', js: 'js-javascript-formulas' },
  },
  damageEffects: { page: CE_DOCS.damageFormulas, anchors: same('life_steal', 'potion_effect', 'function') },
  // Each item behavior has a page of its own (ceItemBehaviorDocs); one without links to the behaviors page
  itemBehaviors: { page: CE_DOCS.itemBehaviors, anchors: {} },
  // Each behavior has a page of its own (the catalog links it)
  furnitureBehaviors: { page: CE_DOCS.furnitureBehaviors, anchors: {} },
  itemUpdaters: { page: CE_DOCS.updater, anchors: same('apply_data', 'transmute', 'reset') },
};

/** The wiki section of a logic type: its heading on the catalog's page, or the page when it has none. */
export function ceLogicDocs(catalog: LogicCatalogName, type: string): string {
  const { page, anchors } = LOGIC_DOCS[catalog];
  return Object.hasOwn(anchors, type) ? `${page}#${anchors[type]}` : page;
}
