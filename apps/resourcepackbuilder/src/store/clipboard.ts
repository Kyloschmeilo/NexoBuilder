/**
 * Clipboard for item properties. It survives switching projects, so properties can also be pasted into items of
 * other projects.
 */
import { create } from 'zustand';
import type { ItemConfigClipboard } from '@resourcepackbuilder/core/nexo/copyConfig';
import { stripFormatting } from '@resourcepackbuilder/core/text';

export const useClipboardStore = create<{ clip: ItemConfigClipboard | null }>(() => ({ clip: null }));

/** Plain-text name of the item the clipboard was copied from. */
export function clipboardLabel(clip: ItemConfigClipboard): string {
  return stripFormatting(clip.sourceName).trim() || clip.sourceNexoId;
}
