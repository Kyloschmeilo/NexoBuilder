/**
 * Clipboard for item properties. Survives switching projects,
 * so properties can also be pasted into items of other projects.
 */
import { create } from 'zustand';
import { copyItemConfig, pasteItemConfig, type ItemConfigClipboard, type PasteOptions } from '@resourcepackbuilder/core/nexo/copyConfig';
import { stripMiniMessage } from '@resourcepackbuilder/ui';
import { useStore } from './store';

export const useItemClipboard = create<{ clip: ItemConfigClipboard | null }>(() => ({ clip: null }));

export function clipboardLabel(clip: ItemConfigClipboard): string {
  return stripMiniMessage(clip.sourceName).trim() || clip.sourceNexoId;
}

export function copyItemProperties(itemId: string) {
  const { project, toast } = useStore.getState();
  const item = project?.items[itemId];
  if (!project || !item) return;
  const clip = copyItemConfig(item, project.id);
  useItemClipboard.setState({ clip });
  toast('success', `Eigenschaften von „${clipboardLabel(clip)}“ kopiert. Zum Einfügen im Menü eines anderen Items „Eigenschaften einfügen“ wählen.`);
}

export function openPasteDialog(targetItemIds: string[]) {
  const { toast, openDialog } = useStore.getState();
  if (!useItemClipboard.getState().clip) {
    toast('info', 'Zuerst bei einem Item „Eigenschaften kopieren“ wählen.');
    return;
  }
  openDialog({ type: 'pasteConfig', targetItemIds });
}

/** Pastes the properties into all target items – a single undo step. */
export function pasteItemProperties(targetItemIds: string[], options: PasteOptions): number {
  const clip = useItemClipboard.getState().clip;
  if (!clip) return 0;
  let count = 0;
  useStore.getState().mutate((draft) => {
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
