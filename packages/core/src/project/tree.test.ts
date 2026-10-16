import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from './factory';
import { flattenFolderTree, getDescendantFolderIds, getItemsInTreeOrder, isBlockItem } from './tree';

describe('folder tree', () => {
  it('survives folder cycles', () => {
    const project = createProject('Kreis');
    const a = createFolder('A', null);
    const b = createFolder('B', a.id);
    insertFolder(project, a);
    insertFolder(project, b);
    project.folders[b.id].folderIds.push(a.id);
    insertItem(project, createItem({ displayName: 'x', itemId: 'x', folderId: b.id, model: null }));
    expect(getDescendantFolderIds(project, a.id)).toEqual([a.id, b.id]);
    expect(getItemsInTreeOrder(project).map((i) => i.itemId)).toEqual(['x']);
    expect(flattenFolderTree(project).map(({ folder, depth }) => [folder.name, depth])).toEqual([
      ['A', 0],
      ['B', 1],
    ]);
  });
});

describe('isBlockItem', () => {
  const withConfig = (config: Record<string, unknown>) => ({
    ...createItem({ displayName: 'B', itemId: 'b', folderId: 'f', material: 'PAPER', model: null }),
    config: config as never,
  });

  it('takes a CraftEngine block only as an object in block', () => {
    expect(isBlockItem(withConfig({ block: {} }), 'craftengine')).toBe(true);
    expect(isBlockItem(withConfig({ block: true }), 'craftengine')).toBe(false);
    expect(isBlockItem(withConfig({}), 'craftengine')).toBe(false);
    expect(isBlockItem(withConfig({ block: {} }), 'nexo')).toBe(false);
    expect(isBlockItem(withConfig({ Mechanics: { custom_block: { type: 'NOTEBLOCK' } } }), 'nexo')).toBe(true);
  });
});
