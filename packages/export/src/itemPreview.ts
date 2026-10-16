/** The export of a single item as the editor previews it. */
import { packTargetOf } from './targets';
import type { ExportPlan, ItemPlan } from './types';

/** The planned export of an item, if the plan contains it. */
export function findItemPlan(plan: ExportPlan | null, itemId: string): ItemPlan | undefined {
  return plan?.items.find((entry) => entry.item.id === itemId);
}

/** The item's final YAML as the plan's target writes it; '' when the plan does not contain the item. */
export function itemYamlPreview(plan: ExportPlan | null, itemId: string): string {
  const entry = findItemPlan(plan, itemId);
  return plan && entry ? packTargetOf(plan).itemYaml(entry) : '';
}
