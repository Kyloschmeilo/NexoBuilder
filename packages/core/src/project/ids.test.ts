import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from './factory';
import { uniqueId } from '../id';
import { uniqueNexoId, validateItemId } from './ids';
import { itemLabel } from './labels';

describe('item IDs', () => {
  it('finds free and duplicate item IDs', () => {
    const project = createProject('Test');
    const folder = createFolder('A', null);
    insertFolder(project, folder);
    const sword = createItem({ displayName: '<red>Schwert', nexoId: 'sword', folderId: folder.id, model: null });
    insertItem(project, sword);
    expect(uniqueId('a', new Set(['a', 'a_2']))).toBe('a_3');
    expect(uniqueNexoId(project, 'Sword')).toBe('sword_2');
    expect(uniqueNexoId(project, 'Sword', sword.id)).toBe('sword');
    expect(validateItemId(project, 'sword')).toEqual({ kind: 'duplicate', other: sword });
    expect(validateItemId(project, 'sword', sword.id)).toBeNull();
    expect(validateItemId(project, '')).toEqual({ kind: 'missing' });
    expect(itemLabel(sword)).toBe('Schwert');
  });
});
