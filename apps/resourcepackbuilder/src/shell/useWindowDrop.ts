import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { filesFromDataTransfer } from '@resourcepackbuilder/ui';
import { isAnyDialogOpen, openDialog } from '../store/dialogs';
import { notify } from './notify';
import { getProject } from '../store/project';
import { useUiStore, type Selection } from '../store/ui';

/** The folder new items from a window drop go to: the selected folder, the selected item's folder, or the first folder. */
function dropFolderId(project: Project, selection: Selection): string | undefined {
  switch (selection?.kind) {
    case 'folder':
      return selection.id;
    case 'item':
      return project.items[selection.id]?.folderId;
    default:
      return project.rootFolderIds[0];
  }
}

function carriesFiles(e: DragEvent): boolean {
  return e.dataTransfer?.types.includes('Files') ?? false;
}

/**
 * Files dropped anywhere in the window (and not already taken by a drop target) open the "New item" dialog for the
 * selected folder, instead of letting the browser navigate away.
 */
export function useWindowDrop(): void {
  const t = useTranslations('layout.main');
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault();
    };
    const handleDrop = async (e: DragEvent) => {
      if (!carriesFiles(e) || !e.dataTransfer) return;
      const isTaken = e.defaultPrevented;
      e.preventDefault();
      const project = getProject();
      const { selection } = useUiStore.getState();
      if (isTaken || !project || isAnyDialogOpen() || selection?.kind === 'view') return;
      const folderId = dropFolderId(project, selection);
      if (!folderId || !project.folders[folderId]) {
        notify('warning', t('dropNeedsFolder'));
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
