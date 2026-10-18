/** The property groups the item editor's Features section shows per target, and the keys other sections own. */
import type { PropertyGroup } from '@resourcepackbuilder/core/form';
import type { PackTargetId } from '@resourcepackbuilder/core/project';

/** The feature groups of each target, in nav order. */
export const FEATURE_GROUPS: Readonly<Record<PackTargetId, readonly PropertyGroup[]>> = {
  nexo: ['components', 'mechanics', 'attributes', 'appearance'],
  craftengine: ['data', 'settings', 'itemBehavior', 'model'],
};

/** Property ids a feature group leaves out because a section of their own edits them, per target and group. */
export const FEATURE_EXCLUDE: Readonly<Record<PackTargetId, Readonly<Record<PropertyGroup, readonly string[]>>>> = {
  // The Furniture section edits the furniture mechanic
  nexo: { mechanics: ['Mechanics.furniture'] },
  craftengine: {},
};
