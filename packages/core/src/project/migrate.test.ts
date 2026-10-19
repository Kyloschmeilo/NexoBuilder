import { describe, expect, it } from 'vitest';
import { CoreError } from '@resourcepackbuilder/utils';
import { migrateItem, migrateProject } from './migrate';
import { parseProjectFile, serializeProject } from './projectFile';
import { createFolder, createItem, createProject, insertFolder, insertItem } from './factory';

describe('migrateProject', () => {
  it('moves armor settings from config.$armor to item.armor', () => {
    const item = migrateItem({
      id: 'i_1',
      itemId: 'helmet',
      config: { material: 'IRON_HELMET', $armor: { set: 'ruby', layer1: '@asset:a1', mob: { wolf_armor: '@asset:w' } } },
    });
    expect(item?.armor).toEqual({ set: 'ruby', layer1: '@asset:a1', mob: { wolf_armor: '@asset:w' } });
    expect(item?.config).toEqual({ material: 'IRON_HELMET' });
  });

  describe('Nexo 1.30 keys', () => {
    const migrate = (config: Record<string, unknown>) => migrateItem({ id: 'i_1', itemId: 'x', config })?.config;

    it('renames requires_supporting to require_supporting', () => {
      expect(migrate({ Mechanics: { custom_block: { type: 'STRINGBLOCK', requires_supporting: false } } })).toEqual({
        Mechanics: { custom_block: { type: 'STRINGBLOCK', require_supporting: false } },
      });
    });

    it('keeps an existing require_supporting over the old key', () => {
      expect(migrate({ Mechanics: { custom_block: { requires_supporting: false, require_supporting: true } } })).toEqual({
        Mechanics: { custom_block: { require_supporting: true } },
      });
    });

    it('turns burns_in_fire/lava: false into Components.damage_resistant like the Nexo converter', () => {
      expect(migrate({ Mechanics: { misc: { burns_in_fire: false, burns_in_lava: true, prevent_renaming: true } } })).toEqual({
        Mechanics: { misc: { prevent_renaming: true } },
        Components: { damage_resistant: 'is_fire' },
      });
      expect(migrate({ Mechanics: { misc: { burns_in_lava: false } }, Components: { max_stack_size: 1 } })).toEqual({
        Mechanics: { misc: {} },
        Components: { max_stack_size: 1, damage_resistant: 'is_fire' },
      });
    });

    it('drops burns_in_* = true and keeps an existing damage_resistant', () => {
      expect(migrate({ Mechanics: { misc: { burns_in_fire: true } } })).toEqual({ Mechanics: { misc: {} } });
      expect(migrate({ Mechanics: { misc: { burns_in_fire: false } }, Components: { damage_resistant: 'is_explosion' } })).toEqual({
        Mechanics: { misc: {} },
        Components: { damage_resistant: 'is_explosion' },
      });
    });

    it('drops repair.nexo_durability_only and smelting.enabled', () => {
      expect(
        migrate({ Mechanics: { repair: { ratio: 0.5, nexo_durability_only: true }, smelting: { enabled: true, play_sound: false } } }),
      ).toEqual({ Mechanics: { repair: { ratio: 0.5 }, smelting: { play_sound: false } } });
    });

    it('turns boolean cullable into TRUE/FALSE and keeps text', () => {
      expect(migrate({ Mechanics: { furniture: { properties: { cullable: true } } } })).toEqual({
        Mechanics: { furniture: { properties: { cullable: 'TRUE' } } },
      });
      expect(migrate({ Mechanics: { furniture: { properties: { cullable: false } } } })).toEqual({
        Mechanics: { furniture: { properties: { cullable: 'FALSE' } } },
      });
      expect(migrate({ Mechanics: { furniture: { properties: { cullable: 'NOT_SET' } } } })).toEqual({
        Mechanics: { furniture: { properties: { cullable: 'NOT_SET' } } },
      });
    });

    it('renames the plural custom_model_data keys of the docs to the keys Nexo 1.30 reads', () => {
      expect(migrate({ Components: { custom_model_data: { floats: [1.5], colors: ['#ff0000'], strings: ['a'], flags: [true] } } })).toEqual(
        {
          Components: { custom_model_data: { float: [1.5], color: ['#ff0000'], string: ['a'], flag: [true] } },
        },
      );
      expect(migrate({ Components: { custom_model_data: { floats: [2], float: [1] } } })).toEqual({
        Components: { custom_model_data: { float: [1] } },
      });
    });

    it('renames blocks of can_place_on and can_break to block', () => {
      expect(migrate({ Components: { can_place_on: { blocks: ['stone'] }, can_break: { blocks: ['dirt'], block: 'sand' } } })).toEqual({
        Components: { can_place_on: { block: ['stone'] }, can_break: { block: 'sand' } },
      });
    });

    it('leaves current configs untouched', () => {
      const config = { Mechanics: { custom_block: { require_supporting: true }, misc: { prevent_renaming: true } } };
      expect(migrate(config)).toEqual(config);
    });
  });

  it('keeps items without armor free of an armor field', () => {
    expect(migrateItem({ id: 'i_1', itemId: 'sword', config: { material: 'PAPER' } })).not.toHaveProperty('armor');
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

  it('gives a project without a target the Nexo target', () => {
    expect(migrateProject({ name: 'Alt' }, 5).target).toBe('nexo');
    expect(migrateProject({ name: 'Alt', target: 'craftengine' }, 5).target).toBe('craftengine');
    expect(migrateProject({ name: 'Alt', target: 'bogus' }, 5).target).toBe('nexo');
  });

  it('ignores a stored nexoId and derives the item ID from the display name', () => {
    const project = migrateProject({ name: 'Alt', items: { i_1: { nexoId: 'ruby', displayName: 'Ruby Sword' } } }, 5);
    expect(project.items.i_1.itemId).toBe('ruby_sword');
  });

  it('makes derived item IDs unique within the project', () => {
    const project = migrateProject(
      {
        name: 'Alt',
        items: {
          i_1: { nexoId: 'a', displayName: 'Ruby Sword', createdAt: 1 },
          i_2: { nexoId: 'b', displayName: 'Ruby Sword', createdAt: 2 },
        },
      },
      5,
    );
    expect(project.items.i_1.itemId).toBe('ruby_sword');
    expect(project.items.i_2.itemId).toBe('ruby_sword_2');
  });

  it('keeps stored duplicate item IDs unchanged', () => {
    const project = migrateProject({ name: 'Alt', items: { i_1: { itemId: 'x', createdAt: 1 }, i_2: { itemId: 'x', createdAt: 2 } } }, 5);
    expect(project.items.i_1.itemId).toBe('x');
    expect(project.items.i_2.itemId).toBe('x');
  });

  it('derives an invalid stored item ID from the display name', () => {
    const project = migrateProject({ name: 'Alt', items: { i_1: { itemId: 'Ruby Sword!', displayName: 'Gem' } } }, 5);
    expect(project.items.i_1.itemId).toBe('gem');
  });

  it('fills missing fields with defaults and drops dangling item references', () => {
    const project = migrateProject(
      { name: 'Alt', folders: { f_1: { name: 'Waffen', itemIds: ['i_gone', 'i_1'] } }, items: { i_1: { itemId: 'sword' } } },
      5,
    );
    expect(project.settings.packName).toBe('alt');
    expect(project.glyphs).toEqual([]);
    expect(project.folders.f_1).toEqual({ id: 'f_1', name: 'Waffen', parentId: null, folderIds: [], itemIds: ['i_1'] });
    expect(project.items.i_1).toMatchObject({
      id: 'i_1',
      itemId: 'sword',
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
      items: { i_1: { id: 'i_1', itemId: 'x', folderId: 'f_missing', createdAt: 1 } },
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

  it('sets the id of a stored item to its map key', () => {
    const project = migrateProject({ name: 'Ids', items: { i_key: { id: 'i_other', itemId: 'x', createdAt: 1 } } });
    expect(Object.keys(project.items)).toEqual(['i_key']);
    expect(project.items.i_key.id).toBe('i_key');
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
            itemId: 'x',
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

  it('keeps the CraftEngine data leniently and leaves it out when there is none', () => {
    const source = { id: 'a', type: 'block_break', loot: { template: 'default:loot_table/self' } };
    const stored = (craftEngine: unknown) => migrateProject({ name: 'P', target: 'craftengine', craftEngine });
    expect(stored({ lootSources: [source, 'nope', null], futureKey: 1 }).craftEngine).toEqual({ lootSources: [source] });
    expect(stored({ lootSources: 'nope' }).craftEngine).toEqual({ lootSources: [] });
    for (const craftEngine of [undefined, 'nope', [], {}, { lootSources: undefined }]) {
      expect(stored(craftEngine)).not.toHaveProperty('craftEngine');
    }
    expect(migrateProject({ name: 'Nexo' })).not.toHaveProperty('craftEngine');
  });

  it('keeps the attribute system leniently and leaves out an empty one', () => {
    const might = { id: 'might', base: 0 };
    const stored = (attributes: unknown) => migrateProject({ name: 'P', target: 'craftengine', craftEngine: { attributes } }).craftEngine;
    expect(stored({ definitions: [might, 'nope'], damageRules: 'nope', other: 1 })).toEqual({
      attributes: { definitions: [might], damageRules: [] },
    });
    for (const attributes of [undefined, 'nope', {}, { definitions: undefined }]) expect(stored(attributes)).toBeUndefined();
  });

  it('refuses data that is no project', () => {
    expect(() => migrateProject('nope')).toThrow(CoreError);
    expect(() => migrateProject({ items: {} })).toThrow('project.noName');
  });

  it('round-trips through the project file', () => {
    const project = createProject('Rund');
    const folder = createFolder('Teile', null);
    insertFolder(project, folder);
    const item = createItem({ displayName: 'Helm', itemId: 'helm', folderId: folder.id, model: null });
    item.armor = { set: 'rund' };
    insertItem(project, item);
    expect(parseProjectFile(serializeProject(project))).toEqual(project);
    project.craftEngine = { lootSources: [{ id: 'extra', type: 'fishing', loot: 'minecraft:gameplay/fishing' }] };
    expect(parseProjectFile(serializeProject(project))).toEqual(project);
    expect(() => parseProjectFile('{')).toThrow('project.invalidFile');
    expect(() => parseProjectFile('{"app":"Other"}')).toThrow('project.notProjectFile');
  });
});
