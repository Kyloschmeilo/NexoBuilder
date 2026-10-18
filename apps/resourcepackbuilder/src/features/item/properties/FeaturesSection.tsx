/**
 * The Features section of the item editor: one feature list panel per property group of the form (Components,
 * Mechanics … or Data, Settings …). A group picked in the section nav scrolls into view.
 */
import { useEffect } from 'react';
import type { Item } from '@resourcepackbuilder/core/project';
import type { PropertyGroup } from '@resourcepackbuilder/core/form';
import { PropertyGroupPanel } from './PropertyGroupPanel';

export interface FeaturesSectionProps {
  item: Item;
  /** The groups shown, in order. */
  groups: readonly PropertyGroup[];
  /** Property ids each group leaves out because another section edits them. */
  exclude?: Readonly<Record<PropertyGroup, readonly string[]>>;
  /** The group to bring into view (picked in the section nav). */
  focusGroup?: PropertyGroup;
}

/** Every feature group of the item, each one panel. */
export function FeaturesSection({ item, groups, exclude, focusGroup }: FeaturesSectionProps) {
  useEffect(() => {
    if (!focusGroup) return;
    document.querySelector(`[data-section-id="group-${CSS.escape(focusGroup)}"]`)?.scrollIntoView({ block: 'start' });
  }, [focusGroup]);
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <PropertyGroupPanel key={group} item={item} group={group} exclude={exclude?.[group]} />
      ))}
    </div>
  );
}
