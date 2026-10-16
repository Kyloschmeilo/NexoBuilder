/**
 * Clipboard for item properties. It survives switching projects, so properties can also be pasted into items of
 * other projects.
 */
import { create } from 'zustand';
import type { ItemConfigClipboard } from '@resourcepackbuilder/core/nexo/copyConfig';

export const useClipboardStore = create<{ clip: ItemConfigClipboard | null }>(() => ({ clip: null }));
