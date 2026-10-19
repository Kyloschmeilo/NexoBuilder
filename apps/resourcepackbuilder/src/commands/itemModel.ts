/** Changing an item's own item model tree (`item.itemModel`). */
import type { ItemModelDefinition } from '@resourcepackbuilder/core/project';
import { updateItem } from './items';

/**
 * Sets the item's item model tree; `undefined` removes it (the export writes the generated model again). Equal
 * `historyKey`s in quick succession form one undo step.
 */
export function setItemModelTree(itemId: string, definition: ItemModelDefinition | undefined, historyKey?: string): void {
  updateItem(
    itemId,
    (item) => {
      if (definition) item.itemModel = definition;
      else delete item.itemModel;
    },
    historyKey && `itemModel:${historyKey}`,
  );
}
