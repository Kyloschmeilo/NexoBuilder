/** Folder actions that ask the user first (sidebar, folder view, empty main area). */
import { useTranslations } from 'next-intl';
import { type Folder, getDescendantFolderIds, itemIdsInFolder } from '@resourcepackbuilder/core/project';
import { addFolder, deleteFolder, renameFolder } from '../../commands/folders';
import { confirm, prompt } from '../../store/dialogs';
import { getProject } from '../../store/project';

export function useFolderActions() {
  const t = useTranslations('layout.folder');
  const tCommon = useTranslations('common');
  const tApp = useTranslations('app');

  return {
    /** Asks for a name and creates a folder (top-level when `parentId` is null). */
    async create(parentId: string | null) {
      const name = await prompt({
        title: parentId ? t('newSubfolderTitle') : t('newFolderTitle'),
        label: t('nameLabel'),
        initial: '',
        confirmLabel: tCommon('create'),
      });
      if (name !== null) addFolder(name || tApp('defaults.newFolder'), parentId);
    },

    async rename(folder: Folder) {
      const name = await prompt({
        title: t('renameTitle'),
        label: t('renameLabel'),
        initial: folder.name,
        confirmLabel: tCommon('rename'),
      });
      if (name !== null) renameFolder(folder.id, name);
    },

    async remove(folder: Folder) {
      const project = getProject();
      if (!project) return;
      const ids = getDescendantFolderIds(project, folder.id);
      const itemCount = itemIdsInFolder(project, folder.id).length;
      const confirmed = await confirm({
        title: t('deleteTitle'),
        message:
          itemCount > 0
            ? `${t('deleteContents', { name: folder.name, items: itemCount, subfolders: ids.length - 1 })}\n\n${t('undoHint')}`
            : t('deleteEmpty', { name: folder.name }),
        confirmLabel: tCommon('delete'),
        destructive: true,
      });
      if (confirmed) deleteFolder(folder.id);
    },
  };
}
