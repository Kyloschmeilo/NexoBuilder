import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  createFolder,
  createItem,
  createProject,
  createRecipe,
  insertFolder,
  insertItem,
  DIRECTIONAL_MODEL_SLOTS,
  FURNITURE_MODEL_SLOTS,
  isVariantForTarget,
  STACK_MODELS,
  stateDef,
  type Item,
  type Project,
  VARIANTS,
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
import { CE_MODEL_SLOTS } from './variants';
import { folderConfigPath } from '..';

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
        'recipes:',
        '  kristall:crystal_sword_shaped:',
        '    type: shaped',
        '    pattern:',
        '      - A',
        '      - A',
        '      - B',
        '    ingredients:',
        '      A: minecraft:amethyst_shard',
        '      B: minecraft:stick',
        '    result:',
        '      id: kristall:crystal_sword',
        '      count: 1',
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

  it('drops the generated model when the raw YAML sets one (CraftEngine reads only the first of model/models)', () => {
    const withModels = oneItemProject((item) => (item.rawYaml = 'models:\n  - a:item/one\n  - a:item/two'));
    const config = planExport(withModels).items[0].config;
    expect(config.model).toBeUndefined();
    expect(config.models).toEqual(['a:item/one', 'a:item/two']);

    const bow = oneItemProject((item) => {
      item.config.material = 'BOW';
      item.variants = { pulling_models: [png('p0.png'), png('p1.png'), png('p2.png')] };
      item.rawYaml = 'texture: a:item/bow';
    });
    const bowConfig = planExport(bow).items[0].config;
    expect(bowConfig.models).toBeUndefined();
    expect(bowConfig.model).toBeUndefined();
    expect(bowConfig.texture).toBe('a:item/bow');
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
    expect(plan.issues.find((i) => i.code === 'ce.variantSlotsFilled')?.args).toEqual({ count: 6, material: 'crossbow' });
  });

  it('picks the slots from the material after the raw YAML', () => {
    const project = oneItemProject((item) => {
      item.variants = { blocking_model: [png('b.png')] };
      item.rawYaml = 'material: minecraft:shield';
    });
    const plan = planExport(project);
    expect(plan.items[0].config.models).toEqual(['einzeln:item/dinge/thing', 'einzeln:item/dinge/thing-blocking']);
    expect(plan.issues.map((i) => i.code)).not.toContain('plan.variantWrongMaterial');
  });

  it('reports models beyond the slots of the material', () => {
    const project = oneItemProject((item) => {
      item.config.material = 'BOW';
      item.variants = { pulling_models: ['p0', 'p1', 'p2', 'p3'].map((n) => png(`${n}.png`)) };
    });
    const plan = planExport(project);
    expect(plan.items[0].config.models).toHaveLength(4);
    expect(plan.issues.find((i) => i.code === 'ce.variantExtraModels')?.args).toEqual({ used: 3, count: 1 });
    expect([...plan.packFiles.keys()].some((path) => path.includes('pulling_3'))).toBe(false);
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

  it('offers only the variant slots its models list uses', () => {
    const used = new Set(Object.values(CE_MODEL_SLOTS).flatMap((slots) => slots.map((s) => s.slot)));
    const all = [...VARIANTS, ...FURNITURE_MODEL_SLOTS, STACK_MODELS, ...DIRECTIONAL_MODEL_SLOTS, stateDef('open')];
    const offered = all.filter((def) => isVariantForTarget(def, 'craftengine')).map((def) => def.slot);
    expect(offered.filter((slot) => !used.has(slot))).toEqual([]);
    expect(all.filter((def) => !isVariantForTarget(def, 'nexo'))).toEqual([]);
  });
});

describe('CraftEngine checks', () => {
  it('warns about an item without a model', () => {
    const project = oneItemProject((item) => (item.model = null));
    expect(planExport(project).issues.find((i) => i.code === 'ce.missingModel')?.level).toBe('warning');
    expect(codes(project)).not.toContain('plan.missingModel');
    // A texture in the raw YAML is a model, too
    const textured = oneItemProject((item) => {
      item.model = null;
      item.rawYaml = 'texture: einzeln:item/dinge/thing';
    });
    expect(codes(textured)).not.toContain('ce.missingModel');
  });

  it('accepts only the item IDs the editor writes', () => {
    for (const id of ['Bad Id', '../evil', 'a/../../b', 'gems/ruby', '/abs', 'a.b']) {
      expect(codes(oneItemProject((item) => (item.itemId = id)))).toContain('ce.itemIdInvalid');
    }
    const accepted = codes(oneItemProject((item) => (item.itemId = 'ruby_2')));
    expect(accepted).not.toContain('ce.itemIdInvalid');
    expect(accepted).not.toContain('plan.itemIdInvalid');
  });

  it('never writes a path outside the export for a traversing item ID', async () => {
    const project = oneItemProject((item) => {
      item.itemId = '../../../evil';
      item.config.material = 'BOW';
      item.variants = { pulling_models: [png('p0.png')] };
    });
    project.settings.yamlFileMode = 'item';
    const plan = planExport(project);
    expect(plan.issues.map((i) => i.code)).toContain('plan.unsafePath');
    const multi = planMultiExport([{ project }]);
    for (const mode of ['full', 'pack', 'items'] as const) {
      expect(listMultiExportPaths(multi, mode).every((p) => !p.split('/').includes('..'))).toBe(true);
    }
  });

  it('reports invalid materials and reserved pack names', () => {
    expect(codes(oneItemProject((item) => (item.rawYaml = 'material: Not Valid')))).toContain('ce.materialInvalid');
    const builtInPacks = ['customcrops', 'default_assets', 'default_feature_populator', 'default_templates', 'internal', 'legacy_armor'];
    for (const name of [...builtInPacks, 'remove_shulker_head', 'default', 'Default_Extra']) {
      const project = oneItemProject(() => {});
      project.settings.packName = name;
      expect(planExport(project).issues.find((i) => i.code === 'ce.reservedPackName')?.level).toBe('error');
    }
    expect(codes(oneItemProject(() => {}))).not.toContain('ce.reservedPackName');
    for (const name of ['defaults', 'my_internal', 'legacy']) {
      const project = oneItemProject(() => {});
      project.settings.packName = name;
      expect(codes(project)).not.toContain('ce.reservedPackName');
    }
  });

  it("shows a folder's config file in the target's plugin folder", () => {
    const project = oneItemProject(() => {});
    const folderId = project.rootFolderIds[0];
    expect(folderConfigPath(project, folderId)).toMatch(
      /^plugins\/CraftEngine\/resources\/[^/]+\/configuration\/items\/dinge\/dinge\.yml$/,
    );
    expect(folderConfigPath({ ...project, target: 'nexo' }, folderId)).toBe('plugins/Nexo/items/dinge/dinge.yml');
    project.settings.yamlFileMode = 'item';
    expect(folderConfigPath(project, folderId)).toMatch(/\/items\/dinge\/<item_id>\.yml$/);
  });

  it('does not warn about the namespace "nexo", which only Nexo uses itself', () => {
    const project = oneItemProject(() => {});
    project.namespace = 'nexo';
    expect(codes(project)).not.toContain('plan.namespaceNexo');
    expect(planExport({ ...project, target: 'nexo' }).issues.map((i) => i.code)).toContain('plan.namespaceNexo');
  });

  it("warns about the namespaces of CraftEngine's own packs, in CraftEngine projects only", () => {
    for (const namespace of ['default', 'internal']) {
      const project = oneItemProject(() => {});
      project.namespace = namespace;
      expect(codes(project)).toContain('plan.namespaceCraftEngine');
      expect(planExport({ ...project, target: 'nexo' }).issues.map((i) => i.code)).not.toContain('plan.namespaceCraftEngine');
    }
    expect(codes(oneItemProject(() => {}))).not.toContain('plan.namespaceCraftEngine');
  });

  it('writes the glyph as an image and leaves out media files without entries', () => {
    const plan = planExport(goldenCraftEngineProject());
    expect([...plan.pluginFiles.keys()].filter((path) => path.includes('/configuration/') && !path.includes('/items/'))).toEqual([
      'resources/kristall_pack/configuration/images.yml',
      'resources/kristall_pack/configuration/categories.yml',
      // The client name of the fixture's block
      'resources/kristall_pack/configuration/lang/en_us.yml',
    ]);
    expect(plan.packFiles.has('assets/kristall/textures/glyphs/gem.png')).toBe(true);
  });
});

describe('CraftEngine recipes', () => {
  it("shows the item's recipes in its YAML preview (the whole file is checked above)", () => {
    const plan = planExport(goldenCraftEngineProject());
    const sword = plan.items.find((p) => p.item.itemId === 'crystal_sword')!;
    expect(itemYamlPreview(plan, sword.item.id)).toContain('kristall:crystal_sword_shaped:');
  });

  it('checks the recipes and warns about project items that are missing', () => {
    const project = oneItemProject((item) => {
      const recipe = createRecipe('stonecutting', 'r');
      recipe.input = { source: 'nexo', id: 'missing' };
      item.recipes = [recipe, createRecipe('furnace', 'r2')];
    });
    const issues = planExport(project).issues;
    expect(issues.find((i) => i.code === 'recipe.ceItemNotInProject')?.level).toBe('warning');
    expect(issues.find((i) => i.code === 'recipe.ingredientMissing')?.context?.at(-1)).toEqual({
      code: 'context.recipeInput',
      args: { recipe: 'thing_furnace' },
    });
  });

  it('reports recipe kinds CraftEngine has no type for and leaves them out', () => {
    const project = oneItemProject((item) => {
      item.recipes = [createRecipe('crafter', 'r')];
    });
    const plan = planExport(project);
    const issue = plan.issues.find((i) => i.code === 'recipe.typeUnsupported');
    expect(issue?.args).toEqual({ target: 'CraftEngine', type: 'crafter' });
    expect(issue?.context?.at(-1)).toEqual({ code: 'context.recipe', args: { recipe: 'thing_crafter' } });
    expect([...plan.pluginFiles.values()].some((text) => String(text).includes('recipes:'))).toBe(false);
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
    expect(guide).toContain('does not build the pack');
    expect(guide).not.toContain('restarting the server works too');
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
    expect(guide.match(/ResourcepackBuilder –/g)).toHaveLength(1);
  });

  it('keeps the name of a Nexo-only archive', async () => {
    const { fileName } = await archiveOf([goldenProject({ externalPackAsZip: false }), goldenSecondProject()]);
    expect(fileName).toBe('resourcepackbuilder_2_projects_nexo.zip');
  });
});
