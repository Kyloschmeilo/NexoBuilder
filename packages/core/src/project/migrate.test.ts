import { describe, expect, it } from 'vitest';
import { CoreError } from '../issues';
import { migrateItem, migrateProject } from './migrate';
import { parseProjectFile, serializeProject } from './projectFile';
import { createFolder, createItem, createProject, insertFolder, insertItem } from './factory';

describe('migrateProject', () => {
  it('moves armor settings from config.$armor to item.armor', () => {
    const item = migrateItem({
      id: 'i_1',
      nexoId: 'helmet',
      config: { material: 'IRON_HELMET', $armor: { set: 'ruby', layer1: '@asset:a1', mob: { wolf_armor: '@asset:w' } } },
    });
    expect(item?.armor).toEqual({ set: 'ruby', layer1: '@asset:a1', mob: { wolf_armor: '@asset:w' } });
    expect(item?.config).toEqual({ material: 'IRON_HELMET' });
  });

  it('keeps items without armor free of an armor field', () => {
    expect(migrateItem({ id: 'i_1', nexoId: 'sword', config: { material: 'PAPER' } })).not.toHaveProperty('armor');
  });

  it('renames params of stored model issues to args', () => {
    const item = migrateItem({
      id: 'i_1',
      model: {
        source: 'json',
        fileName: 'a.json',
        json: {},
        textures: [],
        issues: [{ level: 'warning', code: 'model.unusedPng', params: { file: 'x.png' } }],
      },
      variants: {
        pulling_models: [
          { source: 'png', json: {}, textures: [], issues: [{ level: 'info', code: 'model.parentsMerged', params: { count: 1 } }] },
        ],
      },
    });
    expect(item?.model?.issues).toEqual([{ level: 'warning', code: 'model.unusedPng', args: { file: 'x.png' } }]);
    expect(item?.variants?.pulling_models?.[0].issues).toEqual([{ level: 'info', code: 'model.parentsMerged', args: { count: 1 } }]);
  });

  it('fills missing fields with defaults and drops dangling item references', () => {
    const project = migrateProject(
      { name: 'Alt', folders: { f_1: { name: 'Waffen', itemIds: ['i_gone', 'i_1'] } }, items: { i_1: { nexoId: 'sword' } } },
      5,
    );
    expect(project.settings.packName).toBe('alt');
    expect(project.glyphs).toEqual([]);
    expect(project.folders.f_1).toEqual({ id: 'f_1', name: 'Waffen', parentId: null, folderIds: [], itemIds: ['i_1'] });
    expect(project.items.i_1).toMatchObject({
      id: 'i_1',
      nexoId: 'sword',
      displayName: '',
      config: {},
      recipes: [],
      assets: {},
      createdAt: 5,
    });
  });

  it('repairs the folder tree of stored data', () => {
    const project = migrateProject({
      name: 'Kaputt',
      rootFolderIds: ['f_gone'],
      folders: {
        f_a: { name: 'A', parentId: 'f_b', folderIds: ['f_b'], itemIds: [] },
        f_b: { name: 'B', parentId: 'f_a', folderIds: ['f_a'], itemIds: [] },
      },
      items: { i_1: { id: 'i_1', nexoId: 'x', folderId: 'f_missing', createdAt: 1 } },
      glyphs: [
        { id: 'g_1', glyphId: 'a' },
        { id: 'g_1', glyphId: 'b' },
      ],
    });
    // The cycle is broken, the item without a folder lands in the first root folder, duplicates are dropped
    expect(project.rootFolderIds).toEqual(['f_a']);
    expect(project.folders.f_a).toMatchObject({ parentId: null, folderIds: ['f_b'], itemIds: ['i_1'] });
    expect(project.folders.f_b).toMatchObject({ parentId: 'f_a', folderIds: [] });
    expect(project.items.i_1.folderId).toBe('f_a');
    expect(project.glyphs.map((g) => g.glyphId)).toEqual(['a']);
  });

  it('drops invalid list entries and falls back to defaults for invalid fields', () => {
    const project = migrateProject(
      {
        name: 'Kaputt',
        settings: { packName: 7, yamlFileMode: 'nope', useItemModel: false },
        folders: { f_1: { name: 'A', parentId: 'f_missing', folderIds: ['f_gone', 3], itemIds: null } },
        glyphs: [null, { id: 'g_1', glyphId: 'smile', placeholders: 'x', ascent: 'high' }, { id: 'g_2' }],
        sounds: [{ id: 's_1', soundId: 'a', files: [null, { name: 'a.ogg', dataUrl: 'data:', size: 'big' }], jukebox: 'yes' }],
        paintings: 'none',
        items: {
          i_1: {
            nexoId: 'x',
            folderId: 'f_1',
            config: { material: 'PAPER', bad: undefined, list: [1, undefined, 'a'] },
            model: { source: 'other', json: { elements: [null, { from: [0, 0, 0], to: [1, 1, 1], faces: { up: null } }] }, textures: [7] },
            recipes: [
              { id: 'r_1', type: 'magic' },
              { id: 'r_2', type: 'shaped', grid: ['A'] },
            ],
            assets: { a: { id: 'a', dataUrl: 5 }, b: 'nope' },
          },
          i_2: 'no item',
        },
      },
      1,
    );
    expect(project.settings).toMatchObject({ packName: 'kaputt', yamlFileMode: 'folder', useItemModel: false });
    expect(project.folders.f_1).toEqual({ id: 'f_1', name: 'A', parentId: null, folderIds: [], itemIds: ['i_1'] });
    expect(project.glyphs).toHaveLength(1);
    expect(project.glyphs[0]).toMatchObject({ glyphId: 'smile', placeholders: [], ascent: 7, kind: 'image' });
    expect(project.sounds[0].files).toEqual([{ name: 'a.ogg', dataUrl: 'data:', size: 0 }]);
    expect(project.sounds[0].jukebox).toBeNull();
    expect(project.paintings).toEqual([]);
    expect(Object.keys(project.items)).toEqual(['i_1']);
    const item = project.items.i_1;
    expect(item.config).toEqual({ material: 'PAPER', list: [1, 'a'] });
    expect(item.model).toMatchObject({ source: 'json', textures: [], json: { elements: [{ from: [0, 0, 0], to: [1, 1, 1], faces: {} }] } });
    expect(item.recipes.map((r) => r.id)).toEqual(['r_2']);
    expect(item.recipes[0].grid).toEqual(['A', '', '', '', '', '', '', '', '']);
    expect(item.assets).toEqual({ a: { id: 'a', name: '', dataUrl: '', width: 0, height: 0, mcmeta: null } });
  });

  it('refuses data that is no project', () => {
    expect(() => migrateProject('nope')).toThrow(CoreError);
    expect(() => migrateProject({ items: {} })).toThrow('project.noName');
  });

  it('round-trips through the project file', () => {
    const project = createProject('Rund');
    const folder = createFolder('Teile', null);
    insertFolder(project, folder);
    const item = createItem({ displayName: 'Helm', nexoId: 'helm', folderId: folder.id, model: null });
    item.armor = { set: 'rund' };
    insertItem(project, item);
    expect(parseProjectFile(serializeProject(project))).toEqual(project);
    expect(() => parseProjectFile('{')).toThrow('project.invalidFile');
    expect(() => parseProjectFile('{"app":"Other"}')).toThrow('project.notProjectFile');
  });
});
