import { ATTRIBUTE_OPERATIONS, ATTRIBUTE_SLOTS, ATTRIBUTES, ENCHANTMENTS } from '../options';
import { field, properties, whenType } from './build';

export const ATTRIBUTE_PROPERTIES = properties('attributes', {
  AttributeModifiers: {
    field: field.objectList(
      {
        attribute: field.select(ATTRIBUTES, { allowCustom: true }),
        amount: field.number({ step: 0.1 }),
        operation: field.select(ATTRIBUTE_OPERATIONS),
        slot: field.select(ATTRIBUTE_SLOTS),
        display: field.object(
          {
            type: field.select(['default', 'hidden', 'override']),
            text: field.text({ format: 'minimessage', ...whenType('override') }),
          },
          { minVersion: '1.21.6' },
        ),
      },
      { titleKey: 'attribute', newItem: () => ({ attribute: 'ATTACK_DAMAGE', amount: 1, operation: 'ADD_NUMBER', slot: 'MAINHAND' }) },
    ),
    defaultValue: () => [{ attribute: 'ATTACK_DAMAGE', amount: 5, operation: 'ADD_NUMBER', slot: 'MAINHAND' }],
  },
  Enchantments: {
    field: field.map(field.number({ integer: true, min: 1, max: 255 }), {
      keyOptions: ENCHANTMENTS,
      keyPlaceholder: true,
      newValue: () => 1,
    }),
    defaultValue: () => ({ sharpness: 1 }),
  },
});
