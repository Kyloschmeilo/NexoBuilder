/**
 * Only one feature of an item is open at a time: opening a feature row closes the item's other rows, so the page
 * shows the feature being edited and one line for everything else. The open rows live in `useUiStore.expandedFeatures`
 * under `<item id>/<property id>`.
 */
import { featureExpansionKey } from '../../../components/features';
import { useUiStore } from '../../../store/ui';

/** Opens or closes one feature row of an item; opening closes the item's other rows. */
export function setFeatureOpen(ownerId: string, propertyId: string, open: boolean): void {
  const key = featureExpansionKey(ownerId, propertyId);
  const prefix = featureExpansionKey(ownerId, '');
  useUiStore.setState((s) => {
    const expanded: Record<string, boolean> = { ...s.expandedFeatures, [key]: open };
    if (open) {
      for (const other of Object.keys(expanded)) if (other !== key && other.startsWith(prefix)) delete expanded[other];
    }
    return { expandedFeatures: expanded };
  });
}

/** Brings a feature row into view (after a section switch has rendered it). */
export function scrollToFeature(propertyId: string): void {
  // Two frames: the first lets React render the section, the second the opened row
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      document.querySelector(`[data-feature-id="${CSS.escape(propertyId)}"]`)?.scrollIntoView({ block: 'center' }),
    ),
  );
}
