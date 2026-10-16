/** Item actions offered in the sidebar and the item editor, with their questions and notices. */
import { useTranslations } from 'next-intl';
import { type Item, itemLabel } from '@resourcepackbuilder/core/project';
import { canPasteItemConfig, clipboardLabel } from '@resourcepackbuilder/core/nexo';
import { copyItemProperties } from '../../commands/clipboard';
import { deleteItem, duplicateItem, setItemModel } from '../../commands/items';
import { useClipboardStore } from '../../store/clipboard';
import { confirm } from '../../store/dialogs';
import { getProject } from '../../store/project';
import { pasteConfigDialog } from '../pasteConfig/PasteConfigDialog';
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
        message: `${t('item.deleteMessage', { name: itemLabel(item), id: item.itemId })}\n\n${t('folder.undoHint')}`,
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

    /** Opens the paste dialog for the target items (or explains that nothing fitting was copied yet). */
    pasteProperties(targetItemIds: string[]) {
      const { clip } = useClipboardStore.getState();
      const target = getProject()?.target;
      if (target && canPasteItemConfig(clip, target)) pasteConfigDialog.openWithPayload({ targetItemIds });
      else if (clip) notify('info', tApp('clipboard.unsupported'));
      else notify('info', tApp('clipboard.nothingCopied'));
    },
  };
}
