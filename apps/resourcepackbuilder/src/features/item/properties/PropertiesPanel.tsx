/** The panel of one property group under the name the model, block and furniture sections import it by. */
import type { Item } from '@resourcepackbuilder/core/project';
import type { PropertyGroup } from '@resourcepackbuilder/core/form';
import { PropertyGroupPanel } from './PropertyGroupPanel';

/**
 * The properties of one group the item uses, as one feature list with "Add feature". `only` limits the group to these
 * property ids (a CraftEngine block shows the keys of its behavior only). Same as {@link PropertyGroupPanel}.
 */
export function PropertiesPanel({ item, group, only }: { item: Item; group: PropertyGroup; only?: string[] }) {
  return <PropertyGroupPanel item={item} group={group} only={only} />;
}
