import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from './factory';
import { flattenFolderTree, getDescendantFolderIds, getItemsInTreeOrder } from './tree';

describe('folder tree', () => {
  it('survives folder cycles', () => {
    const project = createProject('Kreis');
    const a = createFolder('A', null);
    const b = createFolder('B', a.id);
    insertFolder(project, a);
    insertFolder(project, b);
    project.folders[b.id].folderIds.push(a.id);
    insertItem(project, createItem({ displayName: 'x', nexoId: 'x', folderId: b.id, model: null }));
    expect(getDescendantFolderIds(project, a.id)).toEqual([a.id, b.id]);
    expect(getItemsInTreeOrder(project).map((i) => i.nexoId)).toEqual(['x']);
    expect(flattenFolderTree(project).map(({ folder, depth }) => [folder.name, depth])).toEqual([
      ['A', 0],
      ['B', 1],
    ]);
  });
});
