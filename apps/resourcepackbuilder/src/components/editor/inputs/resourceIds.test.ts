import { describe, expect, it } from 'vitest';
import { createProject, type Item } from '@resourcepackbuilder/core/project';
import { projectResourceIds } from './resourceIds';

describe('projectResourceIds', () => {
  it('lists items, their models and textures by the export layout, then sounds, each group sorted', () => {
    const project = createProject('Test', undefined, undefined, 'nexo');
    const texture = (name: string) => ({ id: name, name, dataUrl: '', width: 16, height: 16 });
    const item = (itemId: string, model: boolean): Item =>
      ({
        id: itemId,
        itemId,
        displayName: `<red>${itemId} name`,
        folderId: '',
        model: model ? { source: 'json', fileName: 'm.json', json: {}, textures: [texture('Main'), texture('main')], issues: [] } : null,
        config: {},
        rawYaml: '',
        assets: {},
        recipes: [],
        createdAt: 0,
        updatedAt: 0,
      }) as unknown as Item;
    project.items = { b: item('ruby_sword', true), a: item('amber', false) };
    project.sounds = [{ soundId: 'block.ruby.place' } as never];
    const ns = project.namespace;
    expect(projectResourceIds(project)).toEqual([
      { group: 'items', id: `${ns}:amber`, label: 'amber name' },
      { group: 'items', id: `${ns}:ruby_sword`, label: 'ruby_sword name' },
      { group: 'models', id: `${ns}:item/ruby_sword` },
      { group: 'textures', id: `${ns}:item/ruby_sword/main`, label: 'Main' },
      { group: 'textures', id: `${ns}:item/ruby_sword/main_2`, label: 'main' },
      { group: 'sounds', id: `${ns}:block.ruby.place` },
    ]);
  });
});
