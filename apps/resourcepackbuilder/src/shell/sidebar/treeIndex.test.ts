import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '@resourcepackbuilder/core/project/factory';
import type { Issue } from '@resourcepackbuilder/core/issues';
import { countItemsPerFolder, foldersContaining, levelsByTarget, searchItems, worstLevel } from './treeIndex';

function sampleProject() {
  const project = createProject('Test', 'test');
  const weapons = createFolder('Weapons', null);
  insertFolder(project, weapons);
  const swords = createFolder('Swords', weapons.id);
  insertFolder(project, swords);
  const ruby = createItem({ displayName: 'Ruby sword', nexoId: 'ruby_sword', folderId: swords.id, model: null });
  insertItem(project, ruby);
  const bow = createItem({ displayName: 'Bow', nexoId: 'long_bow', folderId: weapons.id, model: null });
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
