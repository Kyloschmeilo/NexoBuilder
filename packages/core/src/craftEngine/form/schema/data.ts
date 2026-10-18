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
import { CE_DOCS } from './docs';

/**
 * The item data (`data`): mostly vanilla data components that CraftEngine converts across versions. Components
 * without a processor of their own go through the raw `components` map. Colors are written as `r,g,b` without
 * spaces, which is the only form CraftEngine parses.
 */
export const CE_DATA_PROPERTIES = properties(
  'data',
  withDocs(CE_DOCS.data, {
    'data.insert_lore': {
      field: field.object({
        position: field.select(CE_LORE_POSITIONS),
        pattern: field.text({ placeholder: true, showIf: { key: 'position', values: ['BEFORE', 'AFTER'] } }),
        lore: field.stringList({ format: 'minimessage' }),
      }),
      defaultValue: () => ({ position: 'TAIL', lore: [''] }),
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
    'data.profile': { field: field.text({ placeholder: true }), defaultValue: () => '' },
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
      field: field.map(field.number({ integer: true, min: 1, max: 255 }), {
        keyOptions: CE_ENCHANTMENTS,
        keyPlaceholder: true,
        newValue: () => 1,
      }),
      defaultValue: () => ({ 'minecraft:sharpness': 1 }),
    },
    'data.painting_variant': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
    'data.jukebox_playable': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
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
    client_bound_data: {
      hint: true,
      field: field.yaml({ placeholder: true }),
      defaultValue: () => ({ lore: [''] }),
      badge: 'premium',
    },
  }),
);
