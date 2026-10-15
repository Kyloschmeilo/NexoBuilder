/** Creating, renaming, moving and deleting folders. */
import { createFolder, insertFolder } from '@resourcepackbuilder/core/project/factory';
import { getDescendantFolderIds } from '@resourcepackbuilder/core/project/tree';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { getProject, mutate } from '../store/project';
import { select, setExpanded } from '../store/ui';

/** Takes `folderId` out of its parent's (or the top-level) folder list. */
export function detachFolder(draft: Project, folderId: string): void {
  const folder = draft.folders[folderId];
  if (!folder) return;
  const parent = folder.parentId ? draft.folders[folder.parentId] : undefined;
  if (parent) parent.folderIds = parent.folderIds.filter((id) => id !== folderId);
  else draft.rootFolderIds = draft.rootFolderIds.filter((id) => id !== folderId);
}

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
  const trimmed = name.trim();
  if (!trimmed) return;
  mutate((draft) => {
    const folder = draft.folders[folderId];
    if (folder) folder.name = trimmed;
  });
}

/** Deletes a folder with its subfolders and items. */
export function deleteFolder(folderId: string): void {
  mutate((draft) => {
    const ids = getDescendantFolderIds(draft, folderId);
    for (const id of ids) {
      for (const itemId of draft.folders[id]?.itemIds ?? []) delete draft.items[itemId];
    }
    detachFolder(draft, folderId);
    for (const id of ids) delete draft.folders[id];
  });
}

/** Moves a folder into another folder (or to the top level), optionally before a sibling. */
export function moveFolder(folderId: string, newParentId: string | null, beforeFolderId?: string): void {
  const project = getProject();
  if (!project?.folders[folderId]) return;
  if (newParentId !== null && (!project.folders[newParentId] || getDescendantFolderIds(project, folderId).includes(newParentId))) return;
  mutate((draft) => {
    const folder = draft.folders[folderId];
    if (!folder) return;
    // Detach first: it replaces the parent's list
    detachFolder(draft, folderId);
    folder.parentId = newParentId;
    const list = newParentId === null ? draft.rootFolderIds : draft.folders[newParentId].folderIds;
    const index = beforeFolderId ? list.indexOf(beforeFolderId) : -1;
    if (index >= 0) list.splice(index, 0, folderId);
    else list.push(folderId);
  });
}
