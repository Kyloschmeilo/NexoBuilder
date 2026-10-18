import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '@resourcepackbuilder/core/project';
import type { Issue } from '@resourcepackbuilder/utils';
import { countItemsPerFolder, filterItems, foldersContaining, itemKindOf, levelsByTarget, searchItems, worstLevel } from './treeIndex';

function sampleProject() {
  const project = createProject('Test', 'test');
  const weapons = createFolder('Weapons', null);
  insertFolder(project, weapons);
  const swords = createFolder('Swords', weapons.id);
  insertFolder(project, swords);
  const ruby = createItem({ displayName: 'Ruby sword', itemId: 'ruby_sword', folderId: swords.id, model: null });
  insertItem(project, ruby);
  const bow = createItem({ displayName: 'Bow', itemId: 'long_bow', folderId: weapons.id, model: null });
  insertItem(project, bow);
  return { project, weapons, swords, ruby, bow };
}

describe('countItemsPerFolder', () => {
  it('counts the items of subfolders too', () => {
    const { project, weapons, swords } = sampleProject();
    const counts = countItemsPerFolder(project);
    expect(counts.get(weapons.id)).toBe(2);
    expect(counts.get(swords.id)).toBe(1);
  });

  it('survives a folder cycle', () => {
    const { project, weapons, swords } = sampleProject();
    project.folders[swords.id].folderIds.push(weapons.id);
    expect(() => countItemsPerFolder(project)).not.toThrow();
  });
});

describe('search', () => {
  it('finds items by name or id and marks their folders', () => {
    const { project, weapons, swords, ruby } = sampleProject();
    const hits = searchItems(project, 'RUBY');
    expect(hits).toEqual(new Set([ruby.id]));
    expect(foldersContaining(project, hits ?? new Set())).toEqual(new Set([swords.id, weapons.id]));
    expect(searchItems(project, '  ')).toBeNull();
  });
});

describe('levels', () => {
  it('keeps the worst level per target and ignores hints', () => {
    const issues: Issue[] = [
      { level: 'warning', code: 'plan.missingModel', target: { kind: 'item', id: 'i1' } },
      { level: 'error', code: 'plan.duplicateFile', target: { kind: 'item', id: 'i1' } },
      { level: 'info', code: 'model.parentsMerged', target: { kind: 'item', id: 'i2' } },
      { level: 'warning', code: 'glyph.idInvalid', target: { kind: 'glyph', id: 'g1' } },
    ];
    const levels = levelsByTarget(issues, 'item');
    expect([...levels]).toEqual([['i1', 'error']]);
    expect(worstLevel(levelsByTarget(issues, 'glyph').values())).toBe('warning');
    expect(worstLevel([])).toBeNull();
  });
});

describe('itemKindOf', () => {
  it('tells items, blocks and furniture apart for Nexo', () => {
    const { ruby } = sampleProject();
    expect(itemKindOf(ruby, 'nexo')).toBe('item');
    expect(itemKindOf({ ...ruby, config: { Mechanics: { custom_block: { type: 'NOTEBLOCK' } } } }, 'nexo')).toBe('block');
    expect(itemKindOf({ ...ruby, config: { Mechanics: { furniture: {} } } }, 'nexo')).toBe('furniture');
  });

  it('tells items, blocks and furniture apart for CraftEngine, a block winning over furniture', () => {
    const { ruby } = sampleProject();
    expect(itemKindOf({ ...ruby, config: { furniture: {} } }, 'craftengine')).toBe('furniture');
    expect(itemKindOf({ ...ruby, config: { block: {}, furniture: {} } }, 'craftengine')).toBe('block');
    // A block id (string) is a reference, not a definition
    expect(itemKindOf({ ...ruby, config: { block: 'test:ore' } }, 'craftengine')).toBe('item');
  });
});

describe('filterItems', () => {
  it('narrows nothing without a query and with the All chip', () => {
    const { project } = sampleProject();
    expect(filterItems(project, '', 'all', new Map())).toBeNull();
    expect(filterItems(project, ' ', 'all', new Map())).toBeNull();
  });

  it('filters by kind and combines the chip with the search', () => {
    const { project, ruby, bow } = sampleProject();
    project.items[bow.id].config = { Mechanics: { furniture: {} } };
    expect(filterItems(project, '', 'furniture', new Map())).toEqual(new Set([bow.id]));
    expect(filterItems(project, '', 'items', new Map())).toEqual(new Set([ruby.id]));
    expect(filterItems(project, '', 'blocks', new Map())).toEqual(new Set());
    expect(filterItems(project, 'ruby', 'furniture', new Map())).toEqual(new Set());
  });

  it('keeps the items with errors or warnings for the issues chip', () => {
    const { project, ruby } = sampleProject();
    expect(filterItems(project, '', 'issues', new Map([[ruby.id, 'warning']]))).toEqual(new Set([ruby.id]));
    expect(filterItems(project, 'bow', 'issues', new Map([[ruby.id, 'error']]))).toEqual(new Set());
  });
});
