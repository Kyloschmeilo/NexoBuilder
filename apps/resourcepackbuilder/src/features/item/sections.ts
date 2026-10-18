/**
 * The sections of the item editor, in nav order, and which ones a target offers. Each section is a component that
 * draws its own panels; the editor shows one section at a time beside the section nav. The Features section lists the
 * target's feature groups as sub-entries of the nav (`features/<group>`), with their counts; empty groups are faint.
 *
 * Sections of other parts of the editor (block, furniture, model, recipes) are mounted here by their exports.
 */
import type { ComponentType } from 'react';
import { activeProperties, type FormSchema, type PropertyGroup } from '@resourcepackbuilder/core/form';
import type { Item, PackTargetId } from '@resourcepackbuilder/core/project';
import type { SectionNavItem } from '@resourcepackbuilder/ui';
import { CraftEngineBlockSection } from './model/CraftEngineBlockSection';
import { CraftEngineFurnitureSection } from './model/CraftEngineFurnitureSection';
import { RecipesTab } from './recipes/RecipesTab';
import { AdvancedSection } from './sections/AdvancedSection';
import { BasicsSection } from './sections/BasicsSection';
import { FEATURE_EXCLUDE, FEATURE_GROUPS } from './sections/featureGroups';
import { EventsSection, ItemFeaturesSection, LootSection } from './sections/GroupSections';
import { ModelSection, TexturesSection } from './sections/ModelSection';

/** Id of a section of the item editor (also its `editorSection` value in the ui store). */
export type ItemSectionId =
  'basics' | 'model' | 'textures' | 'features' | 'block' | 'furniture' | 'events' | 'loot' | 'recipes' | 'advanced';

/** What every section component receives. */
export interface ItemSectionProps {
  item: Item;
  /** A part of the section picked in the nav (the Features section: a group id). */
  focus?: string;
}

export interface ItemSectionDef {
  id: ItemSectionId;
  /** Offered only in projects of these targets (all when left out). */
  targets?: readonly PackTargetId[];
  /** Offered only while this holds for the item. */
  available?: (item: Item) => boolean;
  /** The number shown in the nav. */
  count?: (item: Item, schema: FormSchema) => number;
  Component: ComponentType<ItemSectionProps>;
}

/** Prefix of the nav ids of the feature groups: `features/components`. */
const GROUP_PREFIX = 'features/';

/** The nav id of a feature group. */
export const featureGroupNavId = (group: PropertyGroup): string => `${GROUP_PREFIX}${group}`;

/** How many properties of `group` the item uses, without those another section edits. */
export function groupCount(schema: FormSchema, item: Item, group: PropertyGroup, only?: readonly string[]): number {
  const exclude = FEATURE_EXCLUDE[schema.target][group] ?? [];
  return activeProperties(schema, item, group).filter((def) => (!only || only.includes(def.id)) && !exclude.includes(def.id)).length;
}

/** The count of a group the form limits per item through its tab's `only` (CraftEngine events and loot). */
function limitedGroupCount(group: PropertyGroup) {
  return (item: Item, schema: FormSchema) =>
    groupCount(schema, item, group, schema.tabs.find((tab) => tab.group === group)?.only?.(item.config));
}

/** Every section, in nav order. */
export const ITEM_SECTIONS: readonly ItemSectionDef[] = [
  { id: 'basics', Component: BasicsSection },
  { id: 'model', Component: ModelSection },
  { id: 'textures', available: (item) => !!item.model, count: (item) => item.model?.textures.length ?? 0, Component: TexturesSection },
  {
    id: 'features',
    count: (item, schema) => FEATURE_GROUPS[schema.target].reduce((sum, group) => sum + groupCount(schema, item, group), 0),
    Component: ItemFeaturesSection,
  },
  { id: 'block', targets: ['craftengine'], Component: CraftEngineBlockSection },
  { id: 'furniture', targets: ['craftengine'], Component: CraftEngineFurnitureSection },
  { id: 'events', targets: ['craftengine'], count: limitedGroupCount('events'), Component: EventsSection },
  { id: 'loot', targets: ['craftengine'], count: limitedGroupCount('loot'), Component: LootSection },
  { id: 'recipes', count: (item) => item.recipes.length, Component: RecipesTab },
  { id: 'advanced', Component: AdvancedSection },
];

/** The sections a project of `target` offers for `item`, in nav order. */
export function itemSections(target: PackTargetId, item: Item): ItemSectionDef[] {
  return ITEM_SECTIONS.filter((section) => (!section.targets || section.targets.includes(target)) && (section.available?.(item) ?? true));
}

/** Texts of the nav entries. */
export interface ItemSectionLabels {
  section: (id: ItemSectionId) => string;
  group: (group: PropertyGroup) => string;
}

/** The entries of the section nav: the sections, and below Features one faint-when-empty entry per feature group. */
export function itemSectionNav(schema: FormSchema, item: Item, labels: ItemSectionLabels): SectionNavItem[] {
  return itemSections(schema.target, item).flatMap((section): SectionNavItem[] => {
    const entry: SectionNavItem = { id: section.id, label: labels.section(section.id), count: section.count?.(item, schema) };
    if (section.id !== 'features') return [entry];
    return [
      entry,
      ...FEATURE_GROUPS[schema.target].map((group): SectionNavItem => {
        const count = groupCount(schema, item, group);
        return { id: featureGroupNavId(group), label: labels.group(group), count, level: 1, muted: count === 0 };
      }),
    ];
  });
}

/**
 * The section to show for the stored nav id: a feature group shows the Features section focused on it; an id the item
 * does not offer (or the old tab ids) falls back to the first section.
 */
export function resolveItemSection(
  sections: readonly ItemSectionDef[],
  navId: string,
): { section: ItemSectionDef; focus?: string; navId: string } {
  const first = sections[0];
  if (navId.startsWith(GROUP_PREFIX)) {
    const features = sections.find((section) => section.id === 'features');
    if (features) return { section: features, focus: navId.slice(GROUP_PREFIX.length), navId };
  }
  const section = sections.find((candidate) => candidate.id === navId);
  return section ? { section, navId } : { section: first, navId: first.id };
}
