/**
 * The condition types (`CommonConditions`, checked against the plugin's registry; 35 built in) plus the two that
 * CraftEngine registers for other plugins (`worldguard:region`, `has_money` with Vault). A leading "!" on `type`
 * inverts any condition. No condition is Premium only.
 */
import { field } from '../../form/build';
import { categorized, logicCatalog } from './catalog';
import { conditionList, equipmentSlot, hand, numberProvider, position, resource } from './shared';

const ids = () => field.stringList({ format: 'resource', singleAsString: true });
const regex = () => field.boolean({ defaultHint: false });
const strings = () => field.stringList({ singleAsString: true });

/** The catalog categories (`logic.categories.conditions.<category>`) and the conditions listed under each */
const CATEGORIES = {
  logic: ['all_of', 'any_of', 'inverted', 'random', 'expression', 'equals', 'string_equals', 'string_contains', 'regex', 'is_null', 'js'],
  player: [
    'has_player',
    'permission',
    'hand',
    'equipment',
    'equipment_set',
    'inventory_has_item',
    'has_discovered_recipe',
    'on_cooldown',
    'on_item_cooldown',
    'is_bedrock_player',
    'has_money',
  ],
  item: ['has_item', 'match_item', 'enchantment', 'table_bonus'],
  block: ['match_block', 'match_block_property', 'match_furniture_variant', 'survives_explosion', 'falling_block'],
  world: ['match_entity', 'distance', 'open_water', 'biome', 'world', 'worldguard:region'],
};

export const CE_CONDITIONS = logicCatalog(
  'conditions',
  categorized(
    [
      { type: 'all_of', fields: { terms: conditionList() } },
      { type: 'any_of', fields: { terms: conditionList() } },
      { type: 'inverted', fields: { term: conditionList() } },
      { type: 'has_player' },
      { type: 'has_item' },
      { type: 'match_item', fields: { id: ids(), regex: regex() } },
      {
        type: 'equipment',
        fields: { slot: equipmentSlot(), id: ids(), tag: field.stringList({ format: 'resource' }), regex: regex() },
      },
      {
        type: 'equipment_set',
        fields: {
          set: resource(),
          count: field.number({ integer: true, min: 0, help: true }),
          min: field.number({ integer: true, min: 0 }),
          max: field.number({ integer: true, min: 0 }),
        },
      },
      { type: 'match_entity', fields: { id: ids(), regex: regex() } },
      { type: 'match_block', fields: { id: ids(), regex: regex(), ...position() } },
      { type: 'match_block_property', fields: { properties: field.map(field.text(), { keyPlaceholder: true }) } },
      { type: 'match_furniture_variant', fields: { variants: field.stringList() } },
      { type: 'table_bonus', fields: { enchantment: resource(), chances: field.yaml({ help: true }) } },
      { type: 'survives_explosion' },
      { type: 'falling_block' },
      { type: 'enchantment', fields: { predicate: field.text({ placeholder: true }) } },
      { type: 'random', fields: { value: numberProvider(), id: field.text({ help: true }) } },
      { type: 'distance', fields: { min: numberProvider(), max: numberProvider() } },
      { type: 'permission', fields: { permission: field.text() } },
      { type: 'has_discovered_recipe', fields: { recipe: resource() } },
      { type: 'equals', fields: { value1: field.text(), value2: field.text() } },
      { type: 'string_equals', fields: { value1: field.text(), value2: field.text() } },
      { type: 'string_contains', fields: { value1: field.text(), value2: field.text() } },
      { type: 'regex', fields: { value: field.text(), regex: field.text() } },
      { type: 'expression', fields: { expression: field.text() } },
      { type: 'is_null', fields: { argument: field.text() } },
      { type: 'hand', fields: { hand: hand() } },
      { type: 'on_cooldown', fields: { id: field.text() } },
      { type: 'on_item_cooldown', fields: { id: resource() } },
      { type: 'inventory_has_item', fields: { id: resource(), count: numberProvider() } },
      { type: 'is_bedrock_player' },
      { type: 'open_water' },
      { type: 'biome', fields: { biome: ids() } },
      { type: 'world', fields: { world: strings() } },
      { type: 'js', fields: { script: field.text({ multiline: true }), function: field.text({ placeholder: true }) } },
      {
        type: 'worldguard:region',
        fields: { mode: field.number({ integer: true, min: 1, max: 2, help: true }), regions: field.stringList() },
      },
      { type: 'has_money', fields: { amount: numberProvider() } },
    ],
    CATEGORIES,
  ),
);
