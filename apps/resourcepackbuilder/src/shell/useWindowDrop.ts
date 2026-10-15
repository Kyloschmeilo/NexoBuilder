import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { filesFromDataTransfer } from '@resourcepackbuilder/ui';
import { isAnyDialogOpen, openDialog } from '../store/dialogs';
import { toast } from '../store/notifications';
import { getProject } from '../store/project';
import { useUiStore } from '../store/ui';

/**
 * Files dropped anywhere in the window (and not wasHandled by a drop zone) open the "New item" dialog for the selected
 * folder, instead of letting the browser navigate away.
 */
export function useWindowDrop(): void {
  const t = useTranslations('layout.main');
  useEffect(() => {
    const carriesFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false;
    const handleDragOver = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault();
    };
    const handleDrop = async (e: DragEvent) => {
      if (!carriesFiles(e) || !e.dataTransfer) return;
      const wasHandled = e.defaultPrevented;
      e.preventDefault();
      const project = getProject();
      const { selection } = useUiStore.getState();
      if (wasHandled || !project || isAnyDialogOpen() || selection?.kind === 'view') return;
      const folderId =
        selection?.kind === 'folder'
          ? selection.id
          : selection?.kind === 'item'
            ? project.items[selection.id]?.folderId
            : project.rootFolderIds[0];
      if (!folderId || !project.folders[folderId]) {
        toast('warning', t('dropNeedsFolder'));
        return;
      }
      const files = await filesFromDataTransfer(e.dataTransfer);
      if (files.length) openDialog({ id: 'newItem', props: { folderId, files } });
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [t]);
}
