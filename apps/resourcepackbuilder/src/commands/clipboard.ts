/** Copying item properties and pasting them into other items. */
import { copyItemConfig, pasteItemConfig, type ItemConfigClipboard, type PasteOptions } from '@resourcepackbuilder/core/nexo';
import { useClipboardStore } from '../store/clipboard';
import { getProject, mutate } from '../store/project';

/** Copies the item's properties to the clipboard and returns the copy (null if the item does not exist). */
export function copyItemProperties(itemId: string): ItemConfigClipboard | null {
  const project = getProject();
  const item = project?.items[itemId];
  if (!project || !item) return null;
  const clip = copyItemConfig(item, project.id);
  useClipboardStore.setState({ clip });
  return clip;
}

/** Pastes the clipboard into all target items as one undo step; returns the number of changed items. */
export function pasteItemProperties(targetItemIds: string[], options: PasteOptions): number {
  const { clip } = useClipboardStore.getState();
  if (!clip) return 0;
  let count = 0;
  mutate((draft) => {
    for (const id of targetItemIds) {
      const item = draft.items[id];
      if (!item || item.id === clip.sourceItemId) continue;
      pasteItemConfig(draft, item, clip, options);
      item.updatedAt = Date.now();
      count++;
    }
  });
  return count;
}
