/**
 * The sources of an item browser category (`CategorySources`, checked against the plugin's registry; 3): a `list`
 * of item ids and `#category` references, a `regex` over all item ids, or `all_items`. A category's `source` is one
 * of these or a list of them, whose results are appended in order. No type is Premium only.
 */
import { field } from '../../form/build';
import { logicCatalog } from './catalog';

export const CE_CATEGORY_SOURCES = logicCatalog('categorySources', [
  {
    type: 'list',
    fields: { list: field.stringList({ dynamicSuggestions: 'categoryMembers', placeholder: true, help: true }) },
  },
  { type: 'regex', fields: { regex: field.stringList({ singleAsString: true, placeholder: true, help: true }) } },
  // The plugin's default is true; the wiki's example shows false
  { type: 'all_items', fields: { ignore_vanilla: field.boolean({ defaultHint: true, help: true }) } },
]);
