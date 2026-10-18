/** The Model tab's properties: the item's color, its own item model, the Pack options and the armor trim. */
import { ARMOR_PROPERTY } from '../../../form/armor';
import { field, properties } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { plainOptions } from '../../../form/options';
import { NEXO_DOCS } from './docs';

/** The vanilla armor trim patterns */
const TRIM_PATTERNS = plainOptions(
  [
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
  ].map((name) => `minecraft:${name}`),
);

/** The vanilla armor trim materials */
const TRIM_MATERIALS = plainOptions(
  ['amethyst', 'copper', 'diamond', 'emerald', 'gold', 'iron', 'lapis', 'netherite', 'quartz', 'redstone', 'resin'].map(
    (name) => `minecraft:${name}`,
  ),
);

export const APPEARANCE_PROPERTIES = properties(
  'appearance',
  withDocs(NEXO_DOCS.appearance.page, {
    color: {
      docs: NEXO_DOCS.items.color,
      field: field.text({ format: 'color', placeholder: true }),
      defaultValue: () => '255, 255, 255',
    },
    // The item's own item model wins over the generated definition and the automatic nexo:<id> (see buildItemConfig)
    'Components.item_model': {
      docs: NEXO_DOCS.appearance.invisibleItem,
      field: field.text({ format: 'resource', suggestions: plainOptions(['nexo:empty']), placeholder: true, help: true }),
      defaultValue: () => 'nexo:empty',
      aliases: ['invisible', 'item model'],
    },
    'Pack.oversized_in_gui': {
      field: field.boolean(),
      defaultValue: () => true,
      minVersion: '1.21.6',
      docs: NEXO_DOCS.appearance.oversizedInGui,
    },
    'Pack.custom_model_data': {
      field: field.number({ integer: true, min: 1 }),
      defaultValue: () => 1000,
      docs: NEXO_DOCS.items.customModelData,
    },
    'Pack.hand_swap_animation': { field: field.boolean({ help: true, advanced: true }), defaultValue: () => false },
    'Pack.swap_animation_scale': {
      field: field.number({ min: 0, step: 0.1, help: true, advanced: true }),
      defaultValue: () => 1.0,
      minVersion: '1.21.11',
    },
    trim_pattern: {
      docs: NEXO_DOCS.items.trims,
      field: field.select(TRIM_PATTERNS, { allowCustom: true, help: true, advanced: true }),
      defaultValue: () => 'minecraft:coast',
    },
    trim_material: {
      docs: NEXO_DOCS.items.trims,
      field: field.select(TRIM_MATERIALS, { allowCustom: true, help: true, advanced: true }),
      defaultValue: () => 'minecraft:gold',
    },
    armor: { ...ARMOR_PROPERTY, docs: NEXO_DOCS.armor.page },
  }),
);
