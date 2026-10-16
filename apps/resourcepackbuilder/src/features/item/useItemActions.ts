/** Item actions offered in the sidebar and the item editor, with their questions and notices. */
import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { copyItemProperties } from '../../commands/clipboard';
import { deleteItem, duplicateItem, setItemModel } from '../../commands/items';
import { clipboardLabel, useClipboardStore } from '../../store/clipboard';
import { confirm, openDialog } from '../../store/dialogs';
import { notify } from '../../shell/notify';

export function useItemActions() {
  const t = useTranslations('layout');
  const tCommon = useTranslations('common');
  const tApp = useTranslations('app');
  const tItem = useTranslations('item');

  return {
    duplicate(item: Item) {
      duplicateItem(item.id, item.displayName ? tApp('defaults.copyName', { name: item.displayName }) : '');
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

    async removeModel(itemId: string) {
      const confirmed = await confirm({
        title: tItem('model.removeTitle'),
        message: tItem('model.removeMessage'),
        confirmLabel: tCommon('remove'),
        destructive: true,
      });
      if (confirmed) setItemModel(itemId, null);
    },

    copyProperties(itemId: string) {
      const clip = copyItemProperties(itemId);
      if (clip) notify('success', tApp('clipboard.copied', { name: clipboardLabel(clip) }));
    },

    /** Opens the paste dialog for the target items (or explains that nothing was copied yet). */
    pasteProperties(targetItemIds: string[]) {
      if (useClipboardStore.getState().clip) openDialog({ id: 'pasteConfig', props: { targetItemIds } });
      else notify('info', tApp('clipboard.nothingCopied'));
    },
  };
}
