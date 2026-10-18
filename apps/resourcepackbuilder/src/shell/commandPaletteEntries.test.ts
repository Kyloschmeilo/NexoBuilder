/** The command palette's project entries (folders, items, pages), the "New item" folder and the search ranking. */
import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '@resourcepackbuilder/core/project';
import { availableActivities } from './activities';
import { newItemFolderId, paletteFolders, paletteItems, palettePages, scorePaletteEntry } from './commandPaletteEntries';

function sample() {
  const project = createProject('Demo', 'demo', undefined, 'craftengine');
  const weapons = createFolder('Weapons', null);
  insertFolder(project, weapons);
  const swords = createFolder('Swords', weapons.id);
  insertFolder(project, swords);
  const tools = createFolder('Tools', null);
  insertFolder(project, tools);
  const sword = createItem({ displayName: '<red>Fire Sword', itemId: 'fire_sword', folderId: swords.id, model: null });
  insertItem(project, sword);
  return { project, weapons, swords, tools, sword };
}

describe('paletteFolders', () => {
  it('lists folders in tree order with the path above each', () => {
    const { project } = sample();
    expect(paletteFolders(project).map(({ name, parentPath }) => [name, parentPath])).toEqual([
      ['Weapons', ''],
      ['Swords', 'Weapons'],
      ['Tools', ''],
    ]);
  });

  it('survives a folder cycle', () => {
    const { project, weapons, swords } = sample();
    project.folders[weapons.id]!.parentId = swords.id;
    expect(paletteFolders(project).length).toBe(3);
  });
});

describe('paletteItems', () => {
  it('lists items with their plain label, id and folder path', () => {
    const { project, sword } = sample();
    expect(paletteItems(project)).toEqual([{ id: sword.id, label: 'Fire Sword', itemId: 'fire_sword', folderPath: 'Weapons / Swords' }]);
  });
});

describe('palettePages', () => {
  it('lists the pages of the offered activities', () => {
    const { project } = sample();
    expect(palettePages(availableActivities({ project, hasTestServer: true }))).toEqual([
      { kind: 'view', view: 'glyphs' },
      { kind: 'view', view: 'sounds' },
      { kind: 'view', view: 'paintings' },
      { kind: 'view', view: 'lootSources' },
      { kind: 'view', view: 'templates' },
      { kind: 'view', view: 'globalVariables' },
      { kind: 'view', view: 'attributes' },
      { kind: 'view', view: 'translations' },
      { kind: 'view', view: 'categories' },
      { kind: 'view', view: 'worldgen' },
      { kind: 'view', view: 'atlases' },
      { kind: 'view', view: 'pack' },
      { kind: 'view', view: 'scripts' },
      { kind: 'view', view: 'testServer' },
      { kind: 'settings' },
    ]);
  });
});

describe('newItemFolderId', () => {
  it('prefers the selected folder, then the selected item’s folder, then the first folder', () => {
    const { project, swords, tools, sword } = sample();
    expect(newItemFolderId(project, { kind: 'folder', id: tools.id })).toBe(tools.id);
    expect(newItemFolderId(project, { kind: 'item', id: sword.id })).toBe(swords.id);
    expect(newItemFolderId(project, { kind: 'settings' })).toBe(project.rootFolderIds[0]);
  });

  it('is null without folders', () => {
    expect(newItemFolderId(createProject('Empty'), null)).toBeNull();
  });
});

describe('scorePaletteEntry', () => {
  it('ranks prefix matches above substring matches and ignores case', () => {
    expect(scorePaletteEntry(['Fire Sword', 'fire_sword'], 'fire')).toBe(1);
    expect(scorePaletteEntry(['Fire Sword'], 'SWORD')).toBe(0.5);
    expect(scorePaletteEntry(['Fire Sword'], 'axe')).toBe(0);
  });

  it('matches everything while the search is empty', () => {
    expect(scorePaletteEntry([], '  ')).toBe(1);
  });
});
