/** Item actions offered in the sidebar and the item editor, with their questions and notices. */
import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { copyItemProperties } from '../../commands/clipboard';
import { deleteItem, duplicateItem } from '../../commands/items';
import { clipboardLabel, useClipboardStore } from '../../store/clipboard';
import { confirm, openDialog } from '../../store/dialogs';
import { toast } from '../../store/notifications';

export function useItemActions() {
  const t = useTranslations('layout');
  const tCommon = useTranslations('common');
  const tState = useTranslations('state');

  return {
    duplicate(item: Item) {
      duplicateItem(item.id, item.displayName ? tState('defaults.copyName', { name: item.displayName }) : '');
    },

    async remove(item: Item) {
      const confirmed = await confirm({
        title: t('item.deleteTitle'),
        message: `${t('item.deleteMessage', { name: itemLabel(item), id: item.nexoId })}\n\n${t('folder.undoHint')}`,
        confirmLabel: tCommon('delete'),
        destructive: true,
      });
      if (confirmed) deleteItem(item.id);
    },

    copyProperties(itemId: string) {
      const clip = copyItemProperties(itemId);
      if (clip) toast('success', tState('clipboard.copied', { name: clipboardLabel(clip) }));
    },

    /** Opens the paste dialog for the target items (or explains that nothing was copied yet). */
    pasteProperties(targetItemIds: string[]) {
      if (useClipboardStore.getState().clip) openDialog({ id: 'pasteConfig', props: { targetItemIds } });
      else toast('info', tState('clipboard.nothingCopied'));
    },
  };
}
