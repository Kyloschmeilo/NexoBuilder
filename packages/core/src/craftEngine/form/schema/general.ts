import { CE_COMPONENTS } from '../options';
import { field, properties } from '../../../form/build';
import { CE_DOCS, withDocs } from './docs';

/** Shown on the General tab. `data.item_name` is managed: the item's display name is written there. */
export const CE_GENERAL_PROPERTIES = properties(
  'general',
  withDocs(CE_DOCS.data, {
    'data.lore': {
      field: field.stringList({ format: 'minimessage', placeholder: true }),
      defaultValue: () => [''],
    },
    'data.custom_name': {
      field: field.text({ format: 'minimessage', placeholder: true }),
      defaultValue: () => '',
    },
    'data.unbreakable': { field: field.boolean(), defaultValue: () => true },
    'data.hide_tooltip': {
      field: field.stringList({ suggestions: CE_COMPONENTS, placeholder: true }),
      defaultValue: () => ['minecraft:attribute_modifiers'],
    },
    'data.pdc': { field: field.yaml(), defaultValue: () => ({ key: 'value' }) },
    client_bound_material: {
      field: field.text({ placeholder: true }),
      defaultValue: () => 'paper',
      badge: 'premium',
    },
  }),
);
