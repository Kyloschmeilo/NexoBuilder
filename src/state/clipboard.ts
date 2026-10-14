/**
 * Zwischenablage für Item-Eigenschaften. Bleibt beim Wechsel des Projekts erhalten,
 * so lassen sich Eigenschaften auch in Items anderer Projekte einfügen.
 */
import { create } from 'zustand';
import { copyItemConfig, pasteItemConfig, type ItemConfigClipboard, type PasteOptions } from '../core/nexo/copyConfig';
import { stripMiniMessage } from '../ui/common/MiniMessage';
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

/** Fügt die Eigenschaften in alle Ziel-Items ein – ein einziger Schritt für „Rückgängig“. */
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
