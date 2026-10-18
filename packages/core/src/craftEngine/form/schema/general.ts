import { CE_COMPONENTS, CE_LOCALES } from '../options';
import { field, properties } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { ceDataDocs, loreLines } from './data';
import { CE_DOCS } from './docs';

/**
 * Shown on the General tab. `data.item_name` is managed: the item's display name is written there, or a `<lang:…>`
 * key when the item has translations (stored in `item.translations`, written to the pack's lang files).
 */
export const CE_GENERAL_PROPERTIES = properties(
  'general',
  withDocs(CE_DOCS.data, {
    'data.lore': {
      field: loreLines(),
      defaultValue: () => [''],
      docs: ceDataDocs('lore'),
      common: true,
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
    translations: {
      storage: 'translations',
      hint: true,
      docs: CE_DOCS.lang,
      field: field.map(field.text({ format: 'minimessage', placeholder: true }), {
        keyOptions: CE_LOCALES,
        keyPlaceholder: true,
        newValue: () => '',
      }),
      defaultValue: () => ({ de_de: '' }),
    },
    template: {
      field: field.stringList({ dynamicSuggestions: 'templates', placeholder: true }),
      defaultValue: () => [''],
      hint: true,
      docs: CE_DOCS.templates,
    },
    arguments: {
      field: field.map(field.text({ placeholder: true }), { keyPlaceholder: true, newValue: () => '' }),
      defaultValue: () => ({ material: '' }),
      docs: CE_DOCS.templates,
    },
    client_bound_material: {
      field: field.text({ placeholder: true }),
      defaultValue: () => 'paper',
      badge: 'premium',
    },
  }),
);
