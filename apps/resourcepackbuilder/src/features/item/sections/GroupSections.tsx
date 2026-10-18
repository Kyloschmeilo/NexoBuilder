/**
 * Sections of the item editor that show property groups: Features (every feature group of the target) and the
 * CraftEngine Events and Loot sections, which list only the keys the item's config can use.
 */
import type { Item } from '@resourcepackbuilder/core/project';
import type { PropertyGroup } from '@resourcepackbuilder/core/form';
import { FeaturesSection } from '../properties/FeaturesSection';
import { PropertyGroupPanel } from '../properties/PropertyGroupPanel';
import { useProjectForm } from '../properties/useProjectForm';
import type { ItemSectionProps } from '../sections';
import { FEATURE_EXCLUDE, FEATURE_GROUPS } from './featureGroups';

/** The Features section of the open project's target; `focus` is the group picked in the nav. */
export function ItemFeaturesSection({ item, focus }: ItemSectionProps) {
  const target = useProjectForm().target;
  return <FeaturesSection item={item} groups={FEATURE_GROUPS[target]} exclude={FEATURE_EXCLUDE[target]} focusGroup={focus} />;
}

/** A group that the form limits per item through its tab's `only` (CraftEngine events and loot). */
function LimitedGroupSection({ item, group }: { item: Item; group: PropertyGroup }) {
  const schema = useProjectForm();
  const only = schema.tabs.find((tab) => tab.group === group)?.only?.(item.config);
  return <PropertyGroupPanel item={item} group={group} only={only} />;
}

/** The events of the item and of the block or furniture it places. */
export function EventsSection({ item }: ItemSectionProps) {
  return <LimitedGroupSection item={item} group="events" />;
}

/** What the block or furniture the item places drops. */
export function LootSection({ item }: ItemSectionProps) {
  return <LimitedGroupSection item={item} group="loot" />;
}
