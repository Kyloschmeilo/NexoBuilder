/**
 * The item updater types (`ItemUpdaters`, checked against the plugin's registry; 3): the steps an item's `updater`
 * runs on items of an older version. `apply_data` applies item data (the same keys as `data`), `transmute` swaps
 * the base material, `reset` rebuilds the item and keeps only the listed components (1.20.5+) or NBT paths (older).
 */
import { field } from '../../form/build';
import { CE_COMPONENTS } from '../form/options';
import { logicCatalog } from './catalog';
import { resource } from './shared';

export const CE_ITEM_UPDATERS = logicCatalog('itemUpdaters', [
  { type: 'apply_data', category: 'change', fields: { data: field.yaml({ help: true }) } },
  { type: 'transmute', category: 'change', fields: { material: { ...resource(), placeholder: true } } },
  {
    type: 'reset',
    category: 'reset',
    fields: {
      keep_components: field.stringList({ suggestions: CE_COMPONENTS, minVersion: '1.20.5', help: true }),
      keep_tags: field.stringList({ placeholder: true, help: true, advanced: true }),
    },
  },
]);
