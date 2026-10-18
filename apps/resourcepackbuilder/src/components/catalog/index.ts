/**
 * The typed-entry pattern: the `CatalogDialog` picker with its adapters from the form schema, and the
 * `TypedEntryCard` that edits one picked entry.
 */
export {
  type CatalogText,
  catalogFromPropertyGroup,
  catalogFromTypedSource,
  catalogItemFromProperty,
  catalogItemFromTypedType,
  humanizeKey,
  propertyCategoryKey,
  type TypedCatalogSource,
  typedTypeLabel,
  versionBadges,
} from './adapters';
export { CatalogDialog, type CatalogDialogProps } from './CatalogDialog';
export { categoryIcon } from './categoryIcons';
export { Highlight } from './Highlight';
export {
  CATEGORY_OTHER,
  catalogFacets,
  catalogGroups,
  FACET_ADDED,
  FACET_ALL,
  FACET_COMMON,
  matchCatalogItem,
  searchCatalog,
} from './search';
export { TypedEntryCard, type TypedEntryCardProps, type TypedSource } from './TypedEntryCard';
export type { CatalogBadge, CatalogCategory, CatalogData, CatalogItem } from './types';
export { useCatalogText } from './useCatalogText';
