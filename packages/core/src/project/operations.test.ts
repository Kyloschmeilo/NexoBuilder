import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { createRecipe } from '../nexo/recipes/model';
import { createFolder, createItem, createProject, insertFolder, insertItem } from './factory';
import {
  canMoveFolder,
  deleteFolder,
  deleteItem,
  duplicateItem,
  firstRootFolder,
  insertNewItem,
  moveFolder,
  moveItem,
  renameFolder,
} from './operations';
import type { Project } from './types';

/** Project with folders A (with child B) and C; items x, y in A and z in B. */
function sample() {
  const project = createProject('Test');
  const a = createFolder('A', null);
  const b = createFolder('B', a.id);
  const c = createFolder('C', null);
  [a, b, c].forEach((folder) => insertFolder(project, folder));
  const x = createItem({ displayName: 'X', nexoId: 'x', folderId: a.id, model: null });
  const y = createItem({ displayName: 'Y', nexoId: 'y', folderId: a.id, model: null });
  const z = createItem({ displayName: 'Z', nexoId: 'z', folderId: b.id, model: null });
  [x, y, z].forEach((item) => insertItem(project, item));
  return { project, a: a.id, b: b.id, c: c.id, x: x.id, y: y.id, z: z.id };
}

describe('folder operations', () => {
  it('renames with a trimmed name and ignores blank names', () => {
    const { project, a } = sample();
    expect(renameFolder(project, a, '  New  ')).toBe(true);
    expect(project.folders[a].name).toBe('New');
    expect(renameFolder(project, a, '   ')).toBe(false);
    expect(project.folders[a].name).toBe('New');
  });

  it('deletes a folder with its subfolders and their items', () => {
    const { project, a, b, c, x, y, z } = sample();
    deleteFolder(project, a);
    expect(project.rootFolderIds).toEqual([c]);
    expect(Object.keys(project.folders)).toEqual([c]);
    for (const id of [x, y, z]) expect(project.items[id]).toBeUndefined();
    expect(project.folders[b]).toBeUndefined();
  });

  it('moves a folder before a sibling and to the top level', () => {
    const { project, a, b, c } = sample();
    expect(moveFolder(project, b, null, a)).toBe(true);
    expect(project.rootFolderIds).toEqual([b, a, c]);
    expect(project.folders[a].folderIds).toEqual([]);
    expect(project.folders[b].parentId).toBeNull();
    expect(moveFolder(project, a, c)).toBe(true);
    expect(project.rootFolderIds).toEqual([b, c]);
    expect(project.folders[c].folderIds).toEqual([a]);
  });

  it('refuses to move a folder into itself or a descendant', () => {
    const { project, a, b } = sample();
    const before = structuredClone(project);
    expect(canMoveFolder(project, a, b)).toBe(false);
    expect(moveFolder(project, a, b)).toBe(false);
    expect(moveFolder(project, a, a)).toBe(false);
    expect(moveFolder(project, a, 'missing')).toBe(false);
    expect(project).toEqual(before);
  });

  it('finds or creates the first top-level folder', () => {
    const { project, a } = sample();
    expect(firstRootFolder(project, 'Media')).toBe(a);
    const empty = createProject('Empty');
    const id = firstRootFolder(empty, 'Media');
    expect(empty.rootFolderIds).toEqual([id]);
    expect(empty.folders[id].name).toBe('Media');
  });
});

describe('item operations', () => {
  it('inserts new items with a unique item ID', () => {
    const { project, a } = sample();
    const item = insertNewItem(project, { displayName: 'X2', nexoId: 'x', folderId: a, model: null }, (draft) => {
      draft.config.material = 'PAINTING';
    });
    expect(item.nexoId).toBe('x_2');
    expect(item.config.material).toBe('PAINTING');
    expect(project.folders[a].itemIds.at(-1)).toBe(item.id);
  });

  it('deletes an item from its folder', () => {
    const { project, a, x, y } = sample();
    deleteItem(project, x);
    expect(project.items[x]).toBeUndefined();
    expect(project.folders[a].itemIds).toEqual([y]);
  });

  it('moves an item before another item or to the end', () => {
    const { project, a, b, x, y, z } = sample();
    expect(moveItem(project, z, a, y)).toBe(true);
    expect(project.folders[a].itemIds).toEqual([x, z, y]);
    expect(project.folders[b].itemIds).toEqual([]);
    expect(project.items[z].folderId).toBe(a);
    expect(moveItem(project, x, b)).toBe(true);
    expect(project.folders[b].itemIds).toEqual([x]);
    expect(moveItem(project, x, 'missing')).toBe(false);
  });

  it('duplicates an item next to the original with new IDs', () => {
    const { project, a, x, y } = sample();
    project.items[x].recipes.push(createRecipe('shaped', 'r_1'));
    const copy = duplicateItem(project, x, 'X copy')!;
    expect(project.folders[a].itemIds).toEqual([x, copy.id, y]);
    expect(copy.id).not.toBe(x);
    expect(copy.nexoId).toBe('x_copy');
    expect(copy.displayName).toBe('X copy');
    expect(copy.recipes[0].id).not.toBe('r_1');
    expect(duplicateItem(project, x, 'again')!.nexoId).toBe('x_copy_2');
  });

  it('duplicates inside an Immer draft', () => {
    const { project, x } = sample();
    let copyId = '';
    const next = produce(project, (draft: Project) => {
      copyId = duplicateItem(draft, x, 'X copy')!.id;
    });
    expect(next.items[copyId].nexoId).toBe('x_copy');
    expect(project.items[copyId]).toBeUndefined();
  });
});
