/**
 * The data a {@link CatalogDialog} shows: one entry per feature, behavior or type the user can add, and the categories
 * they are sorted into. The adapters in `adapters.ts` build it from a form's property group or a typed source.
 */
import type { ReactNode } from 'react';
import type { DocsRef } from '@resourcepackbuilder/ui';

/** A badge on a catalog card: the paid edition only, or the Minecraft versions that have the entry. */
export type CatalogBadge =
  | { kind: 'premium' }
  | {
      kind: 'from' | 'until';
      version: string;
      /** The project's version is outside the range. */
      unsupported?: boolean;
    };

/** One entry the user can add. */
export interface CatalogItem {
  /** What `onAdd` receives: the property id or the type name. */
  id: string;
  /** Human name, translated. */
  label: string;
  /** One sentence; cards clamp it, the detail pane shows it in full. */
  description?: string;
  /** The YAML key or type id, shown in mono. */
  yamlKey: string;
  /** Category id; entries without one are listed under "Other". */
  category?: string;
  /** Listed under "Common" and first in its category. */
  common?: boolean;
  /** Further words a search matches ("durability" for `max_damage`). */
  aliases?: readonly string[];
  /** Icon in the card tile; the category's icon when left out. */
  icon?: ReactNode;
  docs?: DocsRef;
  badges?: readonly CatalogBadge[];
  /** The project's Minecraft version does not have the entry: it sorts last. */
  unsupported?: boolean;
  /** Why the entry cannot be added now (a conflict); the card is disabled and shows the reason. */
  disabledReason?: string;
  /** Already used: the card shows "Added" and offers "Jump to" instead of adding it again. */
  added?: boolean;
  /** The YAML adding the entry writes, shown in the detail pane. */
  preview?: string;
  /** A further note for the detail pane (e.g. what the property needs). */
  note?: string;
}

/** A category facet: its id (as in {@link CatalogItem.category}) and its translated name. */
export interface CatalogCategory {
  id: string;
  label: string;
}

/** What an adapter returns: the entries, and their categories in display order. */
export interface CatalogData {
  items: CatalogItem[];
  categories: CatalogCategory[];
}
