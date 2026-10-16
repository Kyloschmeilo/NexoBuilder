/** Creating, renaming, moving and deleting folders. */
import { createFolder, insertFolder } from '@resourcepackbuilder/core/project';
import * as operations from '@resourcepackbuilder/core/project';
import { mutate } from '../store/project';
import { select, setExpanded } from '../store/ui';

/** Creates a folder, selects it and returns its id. */
export function addFolder(name: string, parentId: string | null): string {
  const folder = createFolder(name, parentId);
  mutate((draft) => insertFolder(draft, folder));
  setExpanded(folder.id, true);
  if (parentId) setExpanded(parentId, true);
  select({ kind: 'folder', id: folder.id });
  return folder.id;
}

export function renameFolder(folderId: string, name: string): void {
  mutate((draft) => void operations.renameFolder(draft, folderId, name));
}

/** Deletes a folder with its subfolders and items. */
export function deleteFolder(folderId: string): void {
  mutate((draft) => operations.deleteFolder(draft, folderId));
}

/** Moves a folder into another folder (or to the top level), optionally before a sibling; never into itself. */
export function moveFolder(folderId: string, newParentId: string | null, beforeFolderId?: string): void {
  mutate((draft) => void operations.moveFolder(draft, folderId, newParentId, beforeFolderId));
}
