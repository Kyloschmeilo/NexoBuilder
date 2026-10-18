/**
 * The Model section of the item editor: the model task's `ModelSection` (model, special appearance, item model tree)
 * followed by the extra furniture and block models, which the furniture and block sections take over once they show
 * them themselves.
 */
import type { Item } from '@resourcepackbuilder/core/project';
import { ModelSection } from '../model';
import { BlockModelsSection } from '../model/BlockModelsSection';
import { FurnitureModelsSection } from '../model/FurnitureModelsSection';

/** The item's model with its special appearance, item model tree and extra models. */
export function ItemModelSection({ item }: { item: Item }) {
  return (
    <div className="flex flex-col gap-3">
      <ModelSection item={item} />
      {item.model && <FurnitureModelsSection item={item} />}
      {item.model && <BlockModelsSection item={item} />}
    </div>
  );
}
