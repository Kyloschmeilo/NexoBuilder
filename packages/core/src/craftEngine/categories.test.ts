import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project';
import type { Folder } from '../project/types';
import { craftEngineCategories } from './categories';

describe('craftEngineCategories', () => {
  it('gives sibling folders with the same slug distinct ids, and an empty sibling removes no other category', () => {
    const project = createProject('Test', 'demo', '1.21.11', 'craftengine');
    const folder = (name: string, parent: Folder | null = null) => {
      const created = createFolder(name, parent?.id ?? null);
      insertFolder(project, created);
      return created;
    };
    const add = (itemId: string, target: Folder) =>
      insertItem(project, createItem({ displayName: itemId, itemId, folderId: target.id, material: 'PAPER', model: null }));
    const upper = folder('Weapons');
    const lower = folder('weapons');
    folder('Weapons!');
    const parent = folder('Tools');
    const childA = folder('Axes', parent);
    const childB = folder('axes', parent);
    add('sword', upper);
    add('dagger', lower);
    add('axe', childA);
    add('hatchet', childB);

    const categories = craftEngineCategories(project, Object.values(project.items));
    expect(Object.keys(categories)).toEqual(['demo:weapons', 'demo:weapons-2', 'demo:tools', 'demo:tools/axes', 'demo:tools/axes-2']);
    expect(categories['demo:weapons']?.list).toEqual(['demo:sword']);
    expect(categories['demo:weapons-2']?.list).toEqual(['demo:dagger']);
    expect(categories['demo:tools']?.list).toEqual(['#demo:tools/axes', '#demo:tools/axes-2']);
  });
});
