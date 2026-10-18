/** The Attributes tab: attribute modifiers, enchantments, stored enchantments and potion effects. */
import { ATTRIBUTE_OPERATIONS, ATTRIBUTE_SLOTS, ATTRIBUTES, ENCHANTMENTS, POTION_EFFECTS } from '../options';
import { field, properties, whenType } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { NEXO_DOCS } from './docs';

export const ATTRIBUTE_PROPERTIES = properties(
  'attributes',
  withDocs(NEXO_DOCS.items.page, {
    AttributeModifiers: {
      docs: NEXO_DOCS.items.attributeModifiers,
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
      docs: NEXO_DOCS.items.enchantments,
      field: field.map(field.number({ integer: true, min: 1, max: 255 }), {
        keyOptions: ENCHANTMENTS,
        keyPlaceholder: true,
        newValue: () => 1,
      }),
      defaultValue: () => ({ sharpness: 1 }),
    },
    // Read by Nexo 1.30 (ItemParser), not in the docs: the enchantments an enchanted book stores
    StoredEnchantments: {
      docs: NEXO_DOCS.items.enchantments,
      field: field.map(field.number({ integer: true, min: 1, max: 255 }), {
        keyOptions: ENCHANTMENTS,
        keyPlaceholder: true,
        newValue: () => 1,
        help: true,
        advanced: true,
      }),
      defaultValue: () => ({ mending: 1 }),
    },
    // Read by Nexo 1.30 (ItemParser), not in the docs: effects of a potion or tipped arrow
    PotionEffects: {
      field: field.objectList(
        {
          type: field.select(POTION_EFFECTS, { allowCustom: true }),
          duration: field.text({ format: 'duration', placeholder: true }),
          amplifier: field.number({ integer: true, min: 0, max: 255 }),
          ambient: field.boolean(),
          particles: field.boolean({ defaultHint: true }),
          icon: field.boolean({ defaultHint: true }),
        },
        { titleKey: 'type', help: true, advanced: true, newItem: () => ({ type: 'speed', duration: '30s', amplifier: 0 }) },
      ),
      defaultValue: () => [{ type: 'speed', duration: '30s', amplifier: 0 }],
    },
  }),
);
