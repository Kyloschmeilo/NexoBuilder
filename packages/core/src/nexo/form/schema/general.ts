/** The General tab's item root keys: lore, templates, flags, persistent data and the per-item switches of Nexo. */
import { ITEM_FLAGS, PERSISTENT_DATA_TYPES } from '../options';
import { field, properties } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { NEXO_DOCS } from './docs';

const DOCS = NEXO_DOCS.items;

export const GENERAL_PROPERTIES = properties(
  'general',
  withDocs(DOCS.page, {
    lore: {
      docs: DOCS.lore,
      field: field.stringList({ format: 'minimessage', placeholder: true }),
      defaultValue: () => [''],
    },
    unbreakable: { field: field.boolean(), defaultValue: () => true, docs: DOCS.unbreakable },
    excludeFromInventory: { field: field.boolean(), defaultValue: () => true, docs: DOCS.excludeFromInventory },
    // Documented next to excludeFromInventory
    excludeFromCommands: { field: field.boolean(), defaultValue: () => true, docs: DOCS.excludeFromInventory },
    // Nexo 1.30 reads `template` as one item ID or a list (the docs write the list as `templates`, which 1.30 ignores)
    template: {
      field: field.stringList({ placeholder: true, singleAsString: true, help: true }),
      defaultValue: () => [''],
      docs: DOCS.template,
    },
    ItemFlags: { field: field.multiSelect(ITEM_FLAGS), defaultValue: () => ['HIDE_ATTRIBUTES'], docs: DOCS.itemFlags },
    PersistentData: {
      docs: DOCS.persistentData,
      field: field.objectList(
        {
          type: field.select(PERSISTENT_DATA_TYPES, { allowCustom: true }),
          key: field.text({ placeholder: true }),
          value: field.text(),
        },
        { titleKey: 'key', newItem: () => ({ type: 'STRING', key: 'myplugin:key', value: '' }) },
      ),
      defaultValue: () => [{ type: 'STRING', key: 'myplugin:key', value: '' }],
    },
    customname: {
      docs: DOCS.itemName,
      field: field.text({ format: 'minimessage', placeholder: true, help: true, advanced: true }),
      defaultValue: () => '',
    },
    injectId: { field: field.boolean({ help: true, advanced: true }), defaultValue: () => false, docs: DOCS.injectId },
    no_auto_update: { field: field.boolean({ help: true, advanced: true }), defaultValue: () => true },
  }),
);
