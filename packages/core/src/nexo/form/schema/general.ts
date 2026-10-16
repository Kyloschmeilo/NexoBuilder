import { ITEM_FLAGS, PERSISTENT_DATA_TYPES } from '../options';
import { field, properties } from '../../../form/build';

export const GENERAL_PROPERTIES = properties('general', {
  lore: {
    field: field.stringList({ format: 'minimessage', placeholder: true }),
    defaultValue: () => [''],
  },
  unbreakable: { field: field.boolean(), defaultValue: () => true },
  excludeFromInventory: { field: field.boolean(), defaultValue: () => true },
  excludeFromCommands: { field: field.boolean(), defaultValue: () => true },
  template: { field: field.text({ placeholder: true }), defaultValue: () => '' },
  ItemFlags: { field: field.multiSelect(ITEM_FLAGS), defaultValue: () => ['HIDE_ATTRIBUTES'] },
  PersistentData: {
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
});
