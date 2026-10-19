import { isPlainObject } from '@resourcepackbuilder/utils';
import {
  CE_ATTRIBUTE_OPERATIONS,
  CE_ATTRIBUTE_SLOTS,
  CE_ATTRIBUTES,
  CE_COMPONENTS,
  CE_ENCHANTMENTS,
  CE_EQUIPMENT_SLOTS,
  CE_LORE_POSITIONS,
  CE_TRIM_MATERIALS,
  CE_TRIM_PATTERNS,
} from '../options';
import { field, properties } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { plainOptions } from '../../../form/options';
import { CE_ITEM_UPDATERS } from '../../logic/itemUpdaters';
import { conditionList, functionList, numberProvider } from '../../logic/shared';
import { CE_DOCS } from './docs';

/** The section of a processor on the item data page (its heading's anchor) */
export const ceDataDocs = (anchor: string): string => `${CE_DOCS.data}#${anchor}`;

/** A list whose entries are all texts (a single text counts as one line) */
const isTextList = (value: unknown): boolean =>
  typeof value === 'string' || (Array.isArray(value) && value.every((entry) => !isPlainObject(entry) && !Array.isArray(entry)));

/** A non-empty list whose entries are all objects */
const isObjectList = (value: unknown): boolean => Array.isArray(value) && value.length > 0 && value.every((entry) => isPlainObject(entry));

/**
 * Lore lines as CraftEngine reads them (LoreProcessor): plain MiniMessage lines, or entries with their own
 * priority, operation, line splitting and conditions. A list that mixes both forms is kept as written. Every lore
 * field (`lore`, `insert_lore`, `overwritable_lore`, `dynamic_lore`) shares the messages at `dataShared.lore`.
 */
export function loreLines() {
  return field.choice(
    {
      lines: {
        field: field.stringList({ format: 'minimessage', placeholder: true }),
        matches: isTextList,
        newValue: () => [''],
      },
      entries: {
        field: field.objectList(
          {
            content: field.stringList({ format: 'minimessage', singleAsString: true, placeholder: true }),
            priority: field.number({ integer: true, help: true }),
            operation: field.select(plainOptions(['APPEND', 'PREPEND']), { help: true }),
            split_lines: field.boolean({ defaultHint: false, help: true }),
            conditions: conditionList('logic.shared.conditions'),
          },
          { newItem: () => ({ content: '' }) },
        ),
        matches: isObjectList,
        newValue: () => [{ content: '' }],
      },
    },
    { scope: 'dataShared.lore' },
  );
}

/** Where insert_lore adds its lines, the pattern BEFORE and AFTER look for, and the lines */
const insertLoreFields = () => ({
  position: field.select(CE_LORE_POSITIONS),
  pattern: field.text({ placeholder: true, showIf: { key: 'position', values: ['BEFORE', 'AFTER'] } }),
  lore: loreLines(),
});

/** Enchantment levels by enchantment id */
const enchantmentLevels = () =>
  field.map(field.number({ integer: true, min: 1, max: 255 }), {
    keyOptions: CE_ENCHANTMENTS,
    keyPlaceholder: true,
    newValue: () => 1,
  });

/** A text of a written book: plain, or `raw` with a `filtered` text for players with the chat filter on */
const filterableText = (scope: string) =>
  field.choice(
    {
      text: { field: field.text({ format: 'minimessage', placeholder: true }), matches: (v) => typeof v === 'string', newValue: () => '' },
      filterable: {
        field: field.object({ raw: field.text({ format: 'minimessage' }), filtered: field.text({ format: 'minimessage' }) }),
        matches: isPlainObject,
        newValue: () => ({ raw: '' }),
      },
    },
    { scope },
  );

/** Keys the client-bound data offers besides its overwritable ones: a conditional entry and common data keys */
const CE_CLIENT_BOUND_KEYS = plainOptions([
  'conditional#1',
  'item_name',
  'lore',
  'insert_lore',
  'functions',
  'item_model',
  'custom_model_data',
  'block_state',
  'components',
]);

/**
 * A key of the client-bound data besides the overwritable ones: a `conditional#<name>` entry (Premium: conditions and
 * the data it applies while they hold) or any data key as YAML.
 */
const clientBoundEntry = () =>
  field.choice({
    conditional: {
      field: field.object({ conditions: conditionList('logic.shared.conditions'), data: field.yaml() }),
      matches: (v) => isPlainObject(v) && ('conditions' in v || 'condition' in v) && 'data' in v,
      newValue: () => ({ conditions: [{ type: 'permission', permission: '' }], data: {} }),
    },
    value: { field: field.yaml(), matches: (v) => v !== undefined, newValue: () => '' },
  });

/**
 * The item data (`data`): mostly vanilla data components that CraftEngine converts across versions. Components
 * without a processor of their own go through the raw `components` map. Colors are written as `r,g,b` without
 * spaces, which is the only form CraftEngine parses. Also the item's `updater` (the steps that patch items of an
 * older version, keyed by version number) and the Premium `client_bound_data`.
 */
export const CE_DATA_PROPERTIES = properties(
  'data',
  withDocs(CE_DOCS.data, {
    'data.insert_lore': {
      field: field.object({
        ...insertLoreFields(),
        // The insert_lore used when the pattern matches no line
        fallback: field.object(insertLoreFields(), { help: true }),
      }),
      defaultValue: () => ({ position: 'TAIL', lore: [''] }),
      docs: ceDataDocs('insert_lore'),
    },
    'data.remove_lore': { field: field.text({ placeholder: true }), defaultValue: () => '' },
    'data.tooltip_style': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
    'data.dyed_color': { field: field.text({ placeholder: true }), defaultValue: () => '255,255,255' },
    'data.trim': {
      field: field.object({
        pattern: field.select(CE_TRIM_PATTERNS, { allowCustom: true }),
        material: field.select(CE_TRIM_MATERIALS, { allowCustom: true }),
      }),
      defaultValue: () => ({ pattern: 'eye', material: 'iron' }),
    },
    'data.custom_model_data': {
      hint: true,
      field: numberProvider(),
      defaultValue: () => 10001,
      docs: ceDataDocs('custom_model_data'),
    },
    'data.item_model': {
      hint: true,
      field: field.text({ format: 'resource', placeholder: true }),
      defaultValue: () => '',
      minVersion: '1.21.2',
      docs: ceDataDocs('item_model-1212'),
    },
    'data.profile': {
      field: field.choice({
        text: { field: field.text({ placeholder: true }), matches: (v) => typeof v === 'string', newValue: () => '' },
        map: {
          field: field.object({
            name: field.text({ placeholder: true }),
            texture: field.text({ format: 'resource', placeholder: true, minVersion: '1.20.5' }),
            url: field.text({ placeholder: true, advanced: true }),
            base64: field.text({ advanced: true }),
          }),
          matches: isPlainObject,
          newValue: () => ({ name: '' }),
        },
      }),
      defaultValue: () => '',
      docs: ceDataDocs('profile'),
      aliases: ['player head', 'skull'],
    },
    'data.food': {
      field: field.object({
        nutrition: field.number({ integer: true, min: 0 }),
        saturation: field.number({ min: 0, step: 0.1 }),
        can_always_eat: field.boolean({ defaultHint: false }),
      }),
      defaultValue: () => ({ nutrition: 4, saturation: 2.4 }),
    },
    'data.equippable': {
      field: field.object({
        slot: field.select(CE_EQUIPMENT_SLOTS),
        asset_id: field.text({ format: 'resource', placeholder: true }),
        camera_overlay: field.text({ format: 'resource', placeholder: true }),
        swappable: field.boolean(),
        damage_on_hurt: field.boolean(),
        dispensable: field.boolean(),
        equip_on_interact: field.boolean({ minVersion: '1.21.5' }),
      }),
      defaultValue: () => ({ slot: 'head' }),
    },
    'data.use_remainder': {
      field: field.object({
        id: field.text({ format: 'resource', placeholder: true }),
        count: field.number({ integer: true, min: 1 }),
      }),
      defaultValue: () => ({ id: 'minecraft:glass_bottle' }),
    },
    'data.max_damage': { field: field.number({ integer: true, min: 1 }), defaultValue: () => 250 },
    'data.attribute_modifiers': {
      field: field.objectList(
        {
          type: field.select(CE_ATTRIBUTES, { allowCustom: true }),
          amount: field.number({ step: 0.1 }),
          operation: field.select(CE_ATTRIBUTE_OPERATIONS),
          slot: field.select(CE_ATTRIBUTE_SLOTS, { allowCustom: true }),
          id: field.text({ format: 'resource', placeholder: true }),
        },
        { titleKey: 'type', newItem: () => ({ type: 'attack_damage', amount: 1, operation: 'add_value', slot: 'mainhand' }) },
      ),
      defaultValue: () => [{ type: 'attack_damage', amount: 5, operation: 'add_value', slot: 'mainhand' }],
    },
    'data.enchantment': {
      field: field.choice({
        levels: {
          field: enchantmentLevels(),
          matches: (v) => isPlainObject(v) && !('merge' in v) && !('enchantments' in v),
          newValue: () => ({}),
        },
        // Added to the enchantments the item already has instead of replacing them
        merge: {
          field: field.object({ merge: field.boolean({ defaultHint: false }), enchantments: enchantmentLevels() }),
          matches: (v) => isPlainObject(v) && ('merge' in v || 'enchantments' in v),
          newValue: () => ({ merge: true, enchantments: {} }),
        },
      }),
      defaultValue: () => ({ 'minecraft:sharpness': 1 }),
      docs: ceDataDocs('enchantment'),
      aliases: ['enchantments'],
    },
    'data.painting_variant': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
    'data.jukebox_playable': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
    'data.block_state': {
      field: field.choice({
        block: { field: field.text({ placeholder: true }), matches: (v) => typeof v === 'string', newValue: () => '' },
        properties: {
          field: field.map(field.text(), { keyPlaceholder: true, newValue: () => '' }),
          matches: isPlainObject,
          newValue: () => ({}),
        },
      }),
      defaultValue: () => '',
      docs: ceDataDocs('block_state'),
      aliases: ['blockstate'],
    },
    'data.written_book_content': {
      field: field.object({
        title: filterableText('dataShared.bookTitle'),
        author: field.text({ placeholder: true }),
        generation: field.number({ integer: true, min: 0, max: 3, help: true }),
        resolved: field.boolean({ defaultHint: false }),
        pages: field.choice({
          lines: {
            field: field.stringList({ format: 'minimessage', placeholder: true }),
            matches: (v) => Array.isArray(v) && v.every((page) => typeof page === 'string'),
            newValue: () => [''],
          },
          // Pages of several lines or with a filtered text
          yaml: { field: field.yaml(), matches: (v) => v !== undefined, newValue: () => [{ raw: '', filtered: '' }] },
        }),
      }),
      defaultValue: () => ({ title: '', author: '', pages: [''] }),
      minVersion: '1.20.5',
      docs: ceDataDocs('written_book_content-1205'),
      aliases: ['book'],
    },
    'data.random_values': {
      field: field.map(numberProvider(), { keyPlaceholder: true, newValue: () => '0~1' }),
      defaultValue: () => ({ roll: '0~1' }),
      docs: ceDataDocs('random_values'),
      aliases: ['randoms'],
    },
    'data.functions': {
      field: functionList(),
      defaultValue: () => [{ type: 'set_variable', name: 'score', value_type: 'int', number: 1 }],
      docs: ceDataDocs('function'),
      aliases: ['function'],
    },
    'data.tags': {
      field: field.yaml(),
      defaultValue: () => ({ CustomTag: 'value' }),
      docs: ceDataDocs('tags--nbt'),
      aliases: ['nbt'],
    },
    // Read by the plugin (DynamicLoreProcessor) but not on the wiki
    'data.dynamic_lore': {
      hint: true,
      field: field.map(loreLines(), { keyPlaceholder: true, newValue: () => [''], advanced: true }),
      defaultValue: () => ({ default: [''] }),
      docs: ceDataDocs('lore'),
    },
    'data.external': {
      field: field.object({
        plugin: field.text({ placeholder: true }),
        id: field.text({ placeholder: true }),
      }),
      defaultValue: () => ({ plugin: '', id: '' }),
    },
    'data.components': {
      field: field.map(field.yaml(), { keyOptions: CE_COMPONENTS, keyPlaceholder: true, newValue: () => ({}) }),
      defaultValue: () => ({ 'minecraft:glider': {} }),
    },
    'data.remove_components': {
      field: field.stringList({ suggestions: CE_COMPONENTS, placeholder: true }),
      defaultValue: () => ['minecraft:attribute_modifiers'],
    },
    updater: {
      hint: true,
      field: field.map(
        field.typedList('itemUpdaters', () => CE_ITEM_UPDATERS),
        { keyPlaceholder: true, newValue: () => [{ type: 'apply_data', data: {} }] },
      ),
      defaultValue: () => ({ '1': [{ type: 'apply_data', data: { lore: ['Updated'] } }] }),
      docs: CE_DOCS.updater,
      aliases: ['version'],
    },
    client_bound_data: {
      hint: true,
      field: field.object({
        overwritable_lore: loreLines(),
        overwritable_item_name: field.text({ format: 'minimessage', placeholder: true }),
        overwritable_item_model: field.text({ format: 'resource', placeholder: true, minVersion: '1.21.2' }),
        overwritable_custom_model_data: field.number({ integer: true }),
        // Read by the plugin but not on the wiki
        overwritable_dyed_color: field.text({ placeholder: true, advanced: true, help: true }),
        overwritable_equippable_asset_id: field.text({ format: 'resource', minVersion: '1.21.2', advanced: true, help: true }),
        '*': field.map(clientBoundEntry(), { keyOptions: CE_CLIENT_BOUND_KEYS, keyPlaceholder: true, newValue: () => '' }),
      }),
      defaultValue: () => ({ overwritable_lore: [''] }),
      docs: ceDataDocs('-client-bound-data'),
      badge: 'premium',
    },
  }),
);
