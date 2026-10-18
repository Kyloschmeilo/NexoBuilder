/**
 * The registry model of the Media and Logic panels. A registry is a project-wide view whose page edits a list of
 * entries (glyphs, sounds, loot sources, templates …). The panel lists the entries of every registry, grouped by view,
 * and the page shows the selected one; selecting the view itself shows its overview. Each registry is one descriptor:
 * a new media kind or CraftEngine section becomes master/detail by adding one entry to its registry table.
 */
import type { ExportPlan } from '@resourcepackbuilder/export';
import type { Project } from '@resourcepackbuilder/core/project';
import type { IssueLevel } from '@resourcepackbuilder/utils';
import type { ViewName } from '../../../store/ui';

/** One entry of a registry as the panel lists it. */
export interface RegistryEntry {
  /** Stable within the view while the entry exists; the page receives it as the selected entry */
  key: string;
  /** The entry's id or name; empty while it has none (the panel then shows an "unnamed" label) */
  label: string;
  /** A short fact on the right (type, size, number of keys) */
  detail?: string;
  /** Image shown in front of the label (glyph or painting texture) */
  thumb?: string;
  /** The worst issue level of the entry, if it has issues */
  level?: IssueLevel | null;
}

/** A list of entries inside a registry; most registries have one, some (worldgen, attributes) several. */
export interface RegistryGroup {
  /** Names the group's texts (`media.registry.groups.<id>.*`) */
  id: string;
  entries: RegistryEntry[];
}

/** How new entries are created: by a button (which may ask for a name or a file) and, for media, by dropped files. */
export interface RegistryAdd {
  /** Creates an entry in `group` and returns its key; null when nothing was created (cancelled, rejected file) */
  add: (group: string) => Promise<string | null>;
  /** Files the panel accepts by drop (input `accept` syntax); without it the panel takes no drops */
  accept?: string;
  /** Creates entries from dropped files and returns the key of the first one */
  addFiles?: (files: File[]) => Promise<string | null>;
}

/** A registry view: its entries and how to add one. */
export interface Registry {
  view: ViewName;
  /** The entries, in display order, per group */
  groups: (project: Project, plan: ExportPlan | null) => RegistryGroup[];
  /** A hook (called once per rendered registry) returning the add actions */
  useAdd: () => RegistryAdd;
}

/** The registries by view; a view without one is listed as a plain page link. */
export type RegistryTable = Partial<Record<ViewName, Registry>>;

/** Whether `entry` matches the panel's search text (label or detail, case-insensitive). */
export function entryMatches(entry: RegistryEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return entry.label.toLowerCase().includes(needle) || (entry.detail?.toLowerCase().includes(needle) ?? false);
}

/** The groups with only the entries matching `query`; groups without a match are left out while searching. */
export function filterGroups(groups: RegistryGroup[], query: string): RegistryGroup[] {
  if (!query.trim()) return groups;
  return groups
    .map((group) => ({ ...group, entries: group.entries.filter((entry) => entryMatches(entry, query)) }))
    .filter((group) => group.entries.length > 0);
}

/** The number of entries over all groups. */
export function entryCount(groups: RegistryGroup[]): number {
  return groups.reduce((sum, group) => sum + group.entries.length, 0);
}

/** Whether `key` names an entry of `groups`. */
export function hasEntry(groups: RegistryGroup[], key: string | undefined): boolean {
  return key !== undefined && groups.some((group) => group.entries.some((entry) => entry.key === key));
}

/** The worst issue level over the entries, or null. */
export function worstEntryLevel(groups: RegistryGroup[]): IssueLevel | null {
  let worst: IssueLevel | null = null;
  for (const group of groups)
    for (const { level } of group.entries) {
      if (level === 'error') return 'error';
      if (level === 'warning') worst = 'warning';
      else if (level === 'info' && !worst) worst = 'info';
    }
  return worst;
}
