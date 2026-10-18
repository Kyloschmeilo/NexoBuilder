/**
 * The Model section of the item editor: the model task's `ModelSection` (model, special appearance, item model tree)
 * followed by the extra block models, which the block section takes over once it shows them itself. Furniture models
 * are in the Furniture section.
 */
import type { Item } from '@resourcepackbuilder/core/project';
import { ModelSection } from '../model';
import { BlockModelsSection } from '../model/BlockModelsSection';

/** The item's model with its special appearance, item model tree and extra block models. */
export function ItemModelSection({ item }: { item: Item }) {
  return (
    <div className="flex flex-col gap-3">
      <ModelSection item={item} />
      {item.model && <BlockModelsSection item={item} />}
    </div>
  );
}
