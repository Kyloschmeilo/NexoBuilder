import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type Project,
} from '@resourcepackbuilder/core/project';
import { createTextureModel, type ImportedModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { goldenCraftEngineProject, goldenProject, goldenSecondProject } from '../../golden/fixture';
import { itemYamlPreview } from '../../itemPreview';
import { planExport } from '../../plan';
import { planMultiExport } from '../../selection';
import { buildMultiExportZip, INSTALL_GUIDE_FILE, listMultiExportPaths, pluginFolderEntries } from '../../zip';
import { pluginText } from '../../../test-utils/export';
import { CRAFT_ENGINE_TARGET } from '.';

const PNG16 = makePngDataUrl(16, 16);
const png = (name: string) => createTextureModel('handheld', { layer0: name }, [{ name, dataUrl: PNG16 }]);

const WEAPONS_FILE = 'resources/kristall_pack/configuration/items/waffen/waffen.yml';

/** A CraftEngine project with one item, changed by `edit`. */
function oneItemProject(edit: (item: Item) => void): Project {
  const project = createProject('Einzeln', 'einzeln', '1.21.11', 'craftengine');
  const folder = createFolder('Dinge', null);
  insertFolder(project, folder);
  const item = createItem({ displayName: 'Ding', itemId: 'thing', folderId: folder.id, material: 'PAPER', model: png('thing.png') });
  edit(item);
  insertItem(project, item);
  return project;
}

const codes = (project: Project) => planExport(project).issues.map((i) => i.code);

async function archiveOf(projects: Project[]): Promise<{ fileName: string; guide: string }> {
  const result = await buildMultiExportZip(planMultiExport(projects.map((project) => ({ project }))), 'full');
  const guide = await (await JSZip.loadAsync(result.data)).file(INSTALL_GUIDE_FILE)?.async('string');
  return { fileName: result.fileName, guide: guide ?? '' };
}

describe('CraftEngine item config', () => {
  it('writes items under items: with material, data.item_name, model and models in slot order', () => {
    const plan = planExport(goldenCraftEngineProject());
    expect(pluginText(plan, WEAPONS_FILE)).toBe(
      [
        '# Created with ResourcepackBuilder – project "Kristall Pack"',
        'items:',
        '  kristall:crystal_sword:',
        '    material: diamond_sword',
        '    data:',
        '      item_name: "<aqua>Kristall-Schwert"',
        '      lore:',
        '        - "<gray>Funkelt"',
        '      unbreakable: true',
        '    model: kristall:item/waffen/crystal_sword',
        '    settings:',
        '      fuel_time: 300',
        '    custom_extra:',
        '      keep: me',
        '  kristall:crystal_bow:',
        '    material: bow',
        '    data:',
        '      item_name: "<gold>Bogen"',
        '      my_component: 1',
        '    models:',
        '      - kristall:item/waffen/crystal_bow',
        '      - kristall:item/waffen/crystal_bow-pulling_0',
        '      - kristall:item/waffen/crystal_bow-pulling_1',
        '      - kristall:item/waffen/crystal_bow-pulling_2',
        '    unknown_key: true',
        '',
      ].join('\n'),
    );
  });

  it('lets the raw YAML win over the built config and keeps unknown keys', () => {
    const project = oneItemProject((item) => {
      item.config.data = { item_name: 'from the config', lore: ['a'] };
      item.config.not_a_property = 1;
      item.rawYaml = 'material: stick\ndata:\n  item_name: raw\n  extra: 2\nmodel: other:item/x';
    });
    expect(planExport(project).items[0].config).toEqual({
      material: 'stick',
      data: { item_name: 'raw', lore: ['a'], extra: 2 },
      model: 'other:item/x',
      not_a_property: 1,
    });
  });

  it('writes the display name, not a stored data.item_name', () => {
    const project = oneItemProject((item) => (item.config.data = { item_name: 'stale' }));
    expect(planExport(project).items[0].config.data).toEqual({ item_name: 'Ding' });
  });

  it('shows the items: form in the preview and keys items by namespace:id', () => {
    const project = goldenCraftEngineProject();
    const plan = planExport(project);
    const bow = Object.values(project.items).find((item) => item.itemId === 'crystal_bow');
    if (!bow) throw new Error('no bow');
    expect(CRAFT_ENGINE_TARGET.yamlKey(project, bow)).toBe('kristall:crystal_bow');
    expect(itemYamlPreview(plan, bow.id)).toMatch(/^items:\n {2}kristall:crystal_bow:\n {4}material: bow\n/);
  });
});

describe('CraftEngine variants', () => {
  const modelsOf = (material: string, variants: Item['variants']) =>
    planExport(
      oneItemProject((item) => {
        item.config.material = material;
        item.variants = variants;
      }),
    ).items[0].config.models;

  it('fills missing slots of a crossbow with the main model', () => {
    const project = oneItemProject((item) => {
      item.config.material = 'CROSSBOW';
      item.variants = { pulling_models: [png('p0.png')], firework_model: [png('fw.png')] };
    });
    const plan = planExport(project);
    expect(plan.items[0].config.models).toEqual([
      'einzeln:item/dinge/thing',
      'einzeln:item/dinge/thing-pulling_0',
      'einzeln:item/dinge/thing',
      'einzeln:item/dinge/thing',
      'einzeln:item/dinge/thing',
      'einzeln:item/dinge/thing-firework',
    ]);
    expect(plan.items[0].config.model).toBeUndefined();
    expect(plan.issues.find((i) => i.code === 'ce.variantSlotsFilled')?.args).toEqual({ count: 6, material: 'CROSSBOW' });
  });

  it('maps the shield, fishing rod and elytra slots', () => {
    const one = (name: string): ImportedModel[] => [png(name)];
    expect(modelsOf('SHIELD', { blocking_model: one('b.png') })).toEqual(['einzeln:item/dinge/thing', 'einzeln:item/dinge/thing-blocking']);
    expect(modelsOf('FISHING_ROD', { cast_model: one('c.png') })).toEqual(['einzeln:item/dinge/thing', 'einzeln:item/dinge/thing-cast']);
    expect(modelsOf('ELYTRA', { damaged_models: one('d.png') })).toEqual([
      'einzeln:item/dinge/thing',
      'einzeln:item/dinge/thing-damaged_1',
    ]);
  });

  it('reports variants CraftEngine does not use for the material and does not write them', () => {
    const project = oneItemProject((item) => (item.variants = { cast_model: [png('c.png')], throwing_model: [png('t.png')] }));
    const plan = planExport(project);
    expect(plan.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['plan.variantWrongMaterial', 'ce.variantUnsupported']));
    expect(plan.items[0].config.models).toBeUndefined();
    expect([...plan.packFiles.keys()].some((path) => path.includes('thing-'))).toBe(false);
  });
});

describe('CraftEngine checks', () => {
  it('reports an item without a model as an error', () => {
    const project = oneItemProject((item) => (item.model = null));
    expect(planExport(project).issues.find((i) => i.code === 'ce.missingModel')?.level).toBe('error');
    expect(codes(project)).not.toContain('plan.missingModel');
    // A texture in the raw YAML is a model, too
    const textured = oneItemProject((item) => {
      item.model = null;
      item.rawYaml = 'texture: einzeln:item/dinge/thing';
    });
    expect(codes(textured)).not.toContain('ce.missingModel');
  });

  it('checks item IDs against the characters CraftEngine allows', () => {
    expect(codes(oneItemProject((item) => (item.itemId = 'Bad Id')))).toContain('ce.itemIdInvalid');
    const accepted = codes(oneItemProject((item) => (item.itemId = 'gems/ruby.v2-x')));
    expect(accepted).not.toContain('ce.itemIdInvalid');
    expect(accepted).not.toContain('plan.itemIdInvalid');
  });

  it('notes the glyphs, sounds, paintings and recipes that are not exported yet', () => {
    const plan = planExport(goldenCraftEngineProject());
    const notes = plan.issues.filter((i) => i.code.endsWith('NotExported'));
    expect(notes.map((i) => [i.level, i.code, i.args])).toEqual([
      ['info', 'ce.glyphsNotExported', { count: 1 }],
      ['info', 'ce.recipesNotExported', { count: 1 }],
    ]);
    expect([...plan.pluginFiles.keys()].some((path) => path.includes('glyph') || path.includes('recipe'))).toBe(false);
  });
});

describe('CraftEngine layout', () => {
  it('puts pack.yml, the configuration and the resource pack under resources/<pack>/', () => {
    const project = goldenCraftEngineProject();
    // CraftEngine reads the pack as a folder only
    project.settings.externalPackAsZip = true;
    const paths = listMultiExportPaths(planMultiExport([{ project }]), 'full').filter((p) => p !== INSTALL_GUIDE_FILE);
    expect(paths.every((p) => /^resources\/kristall_pack\/(pack\.yml$|configuration\/|resourcepack\/)/.test(p))).toBe(true);
    expect(paths).toEqual(
      expect.arrayContaining([
        'resources/kristall_pack/pack.yml',
        WEAPONS_FILE,
        'resources/kristall_pack/configuration/items/kram/kram.yml',
        'resources/kristall_pack/resourcepack/pack.mcmeta',
        'resources/kristall_pack/resourcepack/assets/kristall/models/item/waffen/crystal_bow-pulling_0.json',
      ]),
    );
  });

  it('writes one file per item in item mode', () => {
    const project = goldenCraftEngineProject();
    project.settings.yamlFileMode = 'item';
    expect([...planExport(project).pluginFiles.keys()]).toContain('resources/kristall_pack/configuration/items/waffen/crystal_bow.yml');
  });

  it('writes pack.yml with the namespace', () => {
    expect(pluginText(planExport(goldenCraftEngineProject()), 'resources/kristall_pack/pack.yml')).toBe(
      [
        '# Created with ResourcepackBuilder – pack of project "Kristall Pack"',
        'namespace: kristall',
        'author: ResourcepackBuilder',
        'version: "1.0"',
        'description: Kristall Pack – made with ResourcepackBuilder',
        'enable: true',
        '',
      ].join('\n'),
    );
  });

  it('names the archive after the plugin and explains the CraftEngine install', async () => {
    const { fileName, guide } = await archiveOf([goldenCraftEngineProject()]);
    expect(fileName).toBe('kristall_pack_craftengine.zip');
    expect(guide).toContain('into the folder  plugins/CraftEngine/  of your server');
    expect(guide).toContain('/ce reload all');
    expect(guide).toContain('/ce item give Steve kristall:crystal_sword 1');
  });
});

describe('mixed multi export', () => {
  const mixed = () => planMultiExport([{ project: goldenCraftEngineProject() }, { project: goldenSecondProject() }]);

  it('puts each project under its own plugin folder', () => {
    const paths = listMultiExportPaths(mixed(), 'full').filter((p) => p !== INSTALL_GUIDE_FILE);
    expect(paths.every((p) => p.startsWith('plugins/CraftEngine/resources/kristall_pack/') || p.startsWith('plugins/Nexo/'))).toBe(true);
    expect(paths).toContain('plugins/CraftEngine/resources/kristall_pack/pack.yml');
    expect(paths).toContain('plugins/Nexo/items/zweites_pack/dinge/dinge.yml');
  });

  it('gives the test server the files of one project relative to its plugin folder', () => {
    const [ce] = mixed().projects;
    const entries = pluginFolderEntries({ projects: [ce], issues: [] }, { packAsFolder: true });
    expect([...entries.keys()].every((p) => p.startsWith('resources/kristall_pack/'))).toBe(true);
  });

  it('names the archive after the plugins and guides through both', async () => {
    const { fileName, guide } = await archiveOf([goldenCraftEngineProject(), goldenSecondProject()]);
    expect(fileName).toBe('resourcepackbuilder_2_projects_plugins.zip');
    expect(guide).toContain('Extract this ZIP archive into the folder of your server');
    expect(guide).toContain(
      'The folder  plugins/CraftEngine/  of this ZIP archive is merged into the folder  plugins/CraftEngine/  of your server.',
    );
    expect(guide).toContain('The folder  plugins/Nexo/  of this ZIP archive is merged into the folder  plugins/Nexo/  of your server.');
    expect(guide).toContain('/ce item give Steve kristall:crystal_sword 1');
    expect(guide).toContain('/nexo reload all');
    expect(guide).not.toContain('Extract the contents of this ZIP archive into the folder');
  });

  it('keeps the name of a Nexo-only archive', async () => {
    const { fileName } = await archiveOf([goldenProject({ externalPackAsZip: false }), goldenSecondProject()]);
    expect(fileName).toBe('resourcepackbuilder_2_projects_nexo.zip');
  });
});
