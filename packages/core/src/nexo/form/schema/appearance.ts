import { ARMOR_PROPERTY } from '../../../form/armor';
import { field, properties } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { NEXO_DOCS } from './docs';

export const APPEARANCE_PROPERTIES = properties(
  'appearance',
  withDocs(NEXO_DOCS.appearance.page, {
    color: {
      docs: NEXO_DOCS.items.color,
      field: field.text({ format: 'color', placeholder: true }),
      defaultValue: () => '255, 255, 255',
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
    armor: { ...ARMOR_PROPERTY, docs: NEXO_DOCS.armor.page },
  }),
);
