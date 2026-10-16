import { ARMOR_PROPERTY } from '../../../form/armor';
import { field, properties } from '../../../form/build';

export const APPEARANCE_PROPERTIES = properties('appearance', {
  color: {
    field: field.text({ format: 'color', placeholder: true }),
    defaultValue: () => '255, 255, 255',
  },
  'Pack.oversized_in_gui': { field: field.boolean(), defaultValue: () => true, minVersion: '1.21.6' },
  'Pack.custom_model_data': { field: field.number({ integer: true, min: 1 }), defaultValue: () => 1000 },
  armor: ARMOR_PROPERTY,
});
