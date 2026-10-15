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
