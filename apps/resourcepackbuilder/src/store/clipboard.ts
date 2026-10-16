/**
 * Clipboard for item properties. It survives switching projects, so properties can also be pasted into items of
 * other projects of the same target (see canPasteItemConfig).
 */
import { create } from 'zustand';
import type { ItemConfigClipboard } from '@resourcepackbuilder/core/nexo';

export const useClipboardStore = create<{ clip: ItemConfigClipboard | null }>(() => ({ clip: null }));
