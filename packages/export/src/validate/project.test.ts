import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '@resourcepackbuilder/core/project/factory';
import { getItemsInTreeOrder } from '@resourcepackbuilder/core/project/tree';
import { validateItemIds } from './project';

describe('validateItemIds', () => {
  it('reports an empty item ID only as missing, not also as duplicate', () => {
    const project = createProject('Test');
    const folder = createFolder('A', null);
    insertFolder(project, folder);
    insertItem(project, createItem({ displayName: 'A', nexoId: '', folderId: folder.id, model: null }));
    insertItem(project, createItem({ displayName: 'B', nexoId: '', folderId: folder.id, model: null }));
    expect(validateItemIds(getItemsInTreeOrder(project)).map((i) => i.code)).toEqual(['plan.itemIdMissing', 'plan.itemIdMissing']);
  });
});
