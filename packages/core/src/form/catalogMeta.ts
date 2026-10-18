/**
 * Catalog metadata of form properties: the category a property is sorted into in the "Add feature" catalog, whether
 * it is offered first (`common`) and other words a search finds it by (`aliases`). Each target keeps its metadata in
 * one table beside its schema and applies it to the built properties with {@link withCatalog}.
 */
import { keySegment } from '@resourcepackbuilder/utils';
import type { PropertyDef, PropertyGroup } from './build';

/** The message key of a category's name in the form's namespace: `groups.<group>.categories.<camel(category)>`. */
export const categoryMessageKey = (group: PropertyGroup, category: string): string =>
  `groups.${keySegment(group)}.categories.${keySegment(category)}`;

/** The catalog fields of one property. */
export interface PropertyCatalogMeta {
  /** Category id; its name is the message `groups.<group>.categories.<camel(category)>` of the form's namespace */
  category: string;
  common?: boolean;
  aliases?: string[];
}

/** Catalog metadata by property id. */
export type PropertyCatalog = Readonly<Record<string, PropertyCatalogMeta>>;

/**
 * Adds the catalog fields of `catalog` to the properties it names. Fields a property already sets win, so a schema
 * file can override the table. Properties without an entry are returned as they are.
 */
export function withCatalog(properties: readonly PropertyDef[], catalog: PropertyCatalog): PropertyDef[] {
  return properties.map((def) => {
    const meta = catalog[def.id];
    if (!meta) return def;
    return {
      ...def,
      category: def.category ?? meta.category,
      ...((def.common ?? meta.common) && { common: true }),
      ...((def.aliases ?? meta.aliases) && { aliases: def.aliases ?? meta.aliases }),
    };
  });
}

/**
 * Builds a catalog table from categories listed with their property ids: `{ food: ['Components.food', …] }`.
 * `common` and `aliases` are given per property id.
 */
export function catalogTable(
  categories: Readonly<Record<string, readonly string[]>>,
  common: readonly string[] = [],
  aliases: Readonly<Record<string, string[]>> = {},
): PropertyCatalog {
  const table: Record<string, PropertyCatalogMeta> = {};
  for (const [category, ids] of Object.entries(categories)) {
    for (const id of ids) {
      table[id] = {
        category,
        ...(common.includes(id) && { common: true }),
        ...(aliases[id] && { aliases: aliases[id] }),
      };
    }
  }
  return table;
}
