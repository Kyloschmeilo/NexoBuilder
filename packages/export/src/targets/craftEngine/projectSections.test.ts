/**
 * The project-level CraftEngine sections: server translations, free lang keys and block names, categories,
 * worldgen features, atlases, pack.yml, config factories and script files.
 */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  type CraftEngineProjectData,
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type Project,
} from '@resourcepackbuilder/core/project';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PACK = 'resources/welt';
const CONFIG = `${PACK}/configuration`;

/** A CraftEngine project with the folder "Teile", its project data and an `add` for items. */
function ceProject(data: CraftEngineProjectData = {}) {
  const project = createProject('Welt', 'welt', '1.21.11', 'craftengine');
  if (Object.keys(data).length > 0) project.craftEngine = data;
  const parts = createFolder('Teile', null);
  insertFolder(project, parts);
  const add = (itemId: string, material: string, edit: (item: Item) => void = () => {}) => {
    const item = createItem({ displayName: itemId, itemId, folderId: parts.id, material, model: null });
    edit(item);
    insertItem(project, item);
    return item;
  };
  return { project, add };
}

const codes = (project: Project) => planExport(project).issues.map((issue) => issue.code);

describe('CraftEngine translations', () => {
  it('writes the server translations to translations.yml, leaving out bad locales', () => {
    const { project } = ceProject({
      translations: { en: { 'item.lantern': 'Lantern' }, zh_cn: { 'item.lantern': '灯笼' }, 'Bad Locale': { x: 'y' } },
    });
    const plan = planExport(project);
    expect(pluginText(plan, `${CONFIG}/translations.yml`)).toBe(
      [
        '# Created with ResourcepackBuilder – server translations of "Welt"',
        'translations:',
        '  en:',
        '    item.lantern: Lantern',
        '  zh_cn:',
        '    item.lantern: 灯笼',
        '',
      ].join('\n'),
    );
    expect(plan.issues.map((issue) => [issue.code, issue.args])).toContainEqual(['ce.translationsLocaleInvalid', { locale: 'Bad Locale' }]);
  });

  it('writes no translations.yml without translations', () => {
    const { project } = ceProject();
    expect(planExport(project).pluginFiles.has(`${CONFIG}/translations.yml`)).toBe(false);
  });
});

describe('CraftEngine lang', () => {
  it('adds the free lang keys after the item names, also for all languages at once', () => {
    const { project, add } = ceProject({ lang: { en_us: { 'container.inventory': 'Bag' }, all: { 'menu.game': '' } } });
    add('ruby', 'PAPER', (item) => (item.translations = { en_us: 'Ruby' }));
    const plan = planExport(project);
    expect(pluginText(plan, `${CONFIG}/lang/en_us.yml`)).toContain(
      'lang:\n  en_us:\n    item.welt.ruby: Ruby\n    container.inventory: Bag\n',
    );
    expect(pluginText(plan, `${CONFIG}/lang/all.yml`)).toContain('lang:\n  all:\n    menu.game: ""\n');
  });

  it('names custom blocks in the client from the display name and its translations', () => {
    const { project, add } = ceProject();
    add('lantern', 'PAPER', (item) => {
      item.displayName = '<gold>Lantern';
      item.translations = { de_de: 'Laterne' };
      item.config = { block: { settings: { hardness: 1 } } };
    });
    add('stick', 'PAPER');
    const plan = planExport(project);
    expect(pluginText(plan, `${CONFIG}/lang/en_us.yml`)).toContain('    block_name:welt:lantern: "<gold>Lantern"\n');
    expect(pluginText(plan, `${CONFIG}/lang/de_de.yml`)).toContain('    block_name:welt:lantern: Laterne\n');
    expect(pluginText(plan, `${CONFIG}/lang/en_us.yml`)).not.toContain('stick');
  });

  it('reports a free lang locale that is no Minecraft language code', () => {
    const { project } = ceProject({ lang: { 'en-US': { a: 'b' } } });
    expect(codes(project)).toContain('ce.langLocaleInvalid');
    expect(planExport(project).pluginFiles.has(`${CONFIG}/lang/en-US.yml`)).toBe(false);
  });
});

describe('CraftEngine categories', () => {
  it('writes the project categories with one source as that source, after the folder categories', () => {
    const { project, add } = ceProject({
      categories: [
        {
          id: 'swords',
          name: '<!i>Swords',
          icon: 'minecraft:iron_sword',
          priority: 2,
          hidden: false,
          conditions: [{ type: 'permission', permission: 'category.swords' }],
          source: [{ type: 'regex', regex: 'minecraft:.*_sword' }],
        },
        {
          id: 'other:all',
          source: [
            { type: 'all_items', ignore_vanilla: true },
            { type: 'list', list: ['#welt:swords'] },
          ],
        },
        { id: '', name: 'left out' },
      ],
    });
    project.settings.ceCategoriesFromFolders = true;
    add('ruby', 'PAPER', (item) => (item.config = { category: ['welt:swords'] }));
    const plan = planExport(project);
    const text = pluginText(plan, `${CONFIG}/categories.yml`);
    expect(text).toContain(
      [
        '  welt:swords:',
        '    name: "<!i>Swords"',
        '    icon: minecraft:iron_sword',
        '    priority: 2',
        '    hidden: false',
        '    conditions:',
        '      - type: permission',
        '        permission: category.swords',
        '    source:',
        '      type: regex',
        '      regex: minecraft:.*_sword',
        '  other:all:',
        '    source:',
        '      - type: all_items',
        '        ignore_vanilla: true',
        '      - type: list',
        '        list:',
        '          - "#welt:swords"',
        '',
      ].join('\n'),
    );
    // The folder's category comes first
    expect(text.indexOf('welt:teile:')).toBeLessThan(text.indexOf('welt:swords:'));
    expect(pluginText(plan, `${CONFIG}/items/teile/teile.yml`)).toContain('    category:\n      - welt:swords\n');
    expect(codes(project)).toContain('ce.sectionEntryIdMissing');
  });

  it('writes no categories.yml without categories', () => {
    const { project } = ceProject();
    expect(planExport(project).pluginFiles.has(`${CONFIG}/categories.yml`)).toBe(false);
  });
});

describe('CraftEngine worldgen features', () => {
  const tree = { id: 'palm_tree', type: 'minecraft:tree', config: { trunk_provider: { type: 'craftengine:simple_state_provider' } } };

  it('writes configured and placed features to worldgen.yml', () => {
    const { project } = ceProject({
      configuredFeatures: [tree],
      placedFeatures: [
        {
          id: 'palm_tree_beach',
          feature: 'welt:palm_tree',
          placement: [{ type: 'minecraft:rarity_filter', chance: 7 }, { type: 'minecraft:biome' }],
          dimension_type: ['minecraft:overworld'],
          biome: ['minecraft:beach'],
        },
      ],
    });
    const plan = planExport(project);
    expect(pluginText(plan, `${CONFIG}/worldgen.yml`)).toBe(
      [
        '# Created with ResourcepackBuilder – worldgen features of "Welt"',
        'configured_features:',
        '  welt:palm_tree:',
        '    type: minecraft:tree',
        '    config:',
        '      trunk_provider:',
        '        type: craftengine:simple_state_provider',
        '',
        'placed_features:',
        '  welt:palm_tree_beach:',
        '    feature: welt:palm_tree',
        '    placement:',
        '      - type: minecraft:rarity_filter',
        '        chance: 7',
        '      - type: minecraft:biome',
        '    dimension_type:',
        '      - minecraft:overworld',
        '    biome:',
        '      - minecraft:beach',
        '',
      ].join('\n'),
    );
    expect(codes(project).filter((code) => code.startsWith('ce.'))).toEqual([]);
  });

  it('writes the feature config next to its type from Minecraft 26.3 on, as the game reads it there', () => {
    const ore = { size: 6, targets: [{ target: { predicate_type: 'minecraft:tag_match', tag: 'minecraft:stone_ore_replaceables' } }] };
    const { project } = ceProject({
      configuredFeatures: [{ id: 'vein', type: 'minecraft:ore', config: ore }],
      placedFeatures: [{ id: 'patch', feature: { type: 'minecraft:simple_block', config: { schedule_tick: true } }, placement: [] }],
    });
    project.settings.minecraftVersion = '26.3';
    const file = parse(pluginText(planExport(project), `${CONFIG}/worldgen.yml`));
    expect(file.configured_features['welt:vein']).toEqual({ type: 'minecraft:ore', ...ore });
    expect(file.placed_features['welt:patch'].feature).toEqual({ type: 'minecraft:simple_block', schedule_tick: true });

    // Before 26.3 the game reads the config under `config`
    project.settings.minecraftVersion = '26.2';
    const older = parse(pluginText(planExport(project), `${CONFIG}/worldgen.yml`));
    expect(older.configured_features['welt:vein']).toEqual({ type: 'minecraft:ore', config: ore });
    expect(older.placed_features['welt:patch'].feature).toEqual({ type: 'minecraft:simple_block', config: { schedule_tick: true } });
  });

  it('keeps the feature type when the config names one too', () => {
    const { project } = ceProject({ configuredFeatures: [{ id: 'vein', type: 'minecraft:ore', config: { type: 'oops', size: 2 } }] });
    project.settings.minecraftVersion = '26.3';
    const file = parse(pluginText(planExport(project), `${CONFIG}/worldgen.yml`));
    expect(file.configured_features['welt:vein']).toEqual({ type: 'minecraft:ore', size: 2 });
  });

  it('warns when a feature writes block states in the format of another Minecraft version', () => {
    const legacy = { type: 'minecraft:simple_state_provider', state: { Name: 'minecraft:stone' } };
    const modern = { type: 'minecraft:simple', state: { id: 'minecraft:stone' } };
    const { project } = ceProject({
      configuredFeatures: [
        { id: 'old', type: 'minecraft:simple_block', config: { to_place: legacy } },
        { id: 'new', type: 'minecraft:simple_block', config: { to_place: modern } },
      ],
      placedFeatures: [{ id: 'inline', feature: { type: 'minecraft:simple_block', config: { to_place: legacy } }, placement: [] }],
    });
    const stateIssues = () =>
      planExport(project)
        .issues.filter((issue) => issue.code.startsWith('ce.featureState'))
        .map((issue) => [issue.code, issue.level, issue.context?.[0]?.code, issue.context?.[0]?.args?.id]);
    project.settings.minecraftVersion = '26.3';
    expect(stateIssues()).toEqual([
      ['ce.featureStateLegacy', 'warning', 'context.configuredFeature', 'old'],
      ['ce.featureStateLegacy', 'warning', 'context.placedFeature', 'inline'],
    ]);
    project.settings.minecraftVersion = '26.2';
    expect(stateIssues()).toEqual([['ce.featureStateModern', 'warning', 'context.configuredFeature', 'new']]);
  });

  it('reports a biome filter without the biome modifier, a missing feature and an unknown one', () => {
    const { project } = ceProject({
      configuredFeatures: [{ id: 'no_type', config: {} }],
      placedFeatures: [
        { id: 'a', feature: 'welt:missing', placement: [], biome: ['minecraft:beach'] },
        { id: 'b', placement: [] },
        { id: 'c', feature: 'minecraft:oak' },
      ],
    });
    expect(codes(project)).toEqual(
      expect.arrayContaining([
        'ce.configuredFeatureTypeMissing',
        'ce.placedFeatureBiomeWithoutModifier',
        'ce.placedFeatureFeatureMissing',
        'ce.placedFeatureUnknown',
      ]),
    );
    expect(codes(project).filter((code) => code === 'ce.placedFeatureUnknown')).toHaveLength(1);
  });
});

describe('CraftEngine atlases', () => {
  it('writes the atlases to atlases.yml', () => {
    const { project } = ceProject({
      atlases: [
        {
          id: 'minecraft:blocks',
          sources: [
            { type: 'directory', source: 'machines', prefix: 'machines/' },
            {
              type: 'unstitch',
              resource: 'welt:gui/sprites',
              divisor_x: 256,
              regions: [{ sprite: 'welt:gui/button', x: 0, y: 0, width: 20, height: 20 }],
            },
          ],
        },
        { id: 'empty', sources: [] },
      ],
    });
    const plan = planExport(project);
    expect(pluginText(plan, `${CONFIG}/atlases.yml`)).toContain(
      [
        'atlases:',
        '  minecraft:blocks:',
        '    sources:',
        '      - type: directory',
        '        source: machines',
        '        prefix: machines/',
        '      - type: unstitch',
        '        resource: welt:gui/sprites',
        '        divisor_x: 256',
        '        regions:',
        '          - sprite: welt:gui/button',
        '            x: 0',
        '            "y": 0',
        '            width: 20',
        '            height: 20',
        '',
      ].join('\n'),
    );
    expect(pluginText(plan, `${CONFIG}/atlases.yml`)).not.toContain('welt:empty');
    expect(codes(project)).toContain('ce.atlasSourcesMissing');
  });
});

describe('CraftEngine section entry ids', () => {
  it('reports missing, bad and taken ids of every list', () => {
    const { project } = ceProject({
      categories: [{ id: 'Bad Id' }, { id: 'a' }, { id: 'welt:a' }],
      atlases: [{ sources: [{ type: 'single', resource: 'x' }] }],
    });
    expect(codes(project)).toEqual(
      expect.arrayContaining(['ce.sectionEntryIdInvalid', 'ce.sectionEntryIdDuplicate', 'ce.sectionEntryIdMissing']),
    );
  });
});

describe('CraftEngine pack.yml', () => {
  it('writes the project author, version, enable and subpacks', () => {
    const { project } = ceProject({
      pack: { author: 'Kylo', version: '2.1', enable: false, subpacks: { '$$>=1.21.4': { modern: true }, legacy: false } },
    });
    expect(pluginText(planExport(project), `${PACK}/pack.yml`)).toBe(
      [
        '# Created with ResourcepackBuilder – pack of project "Welt"',
        'namespace: welt',
        'author: Kylo',
        'version: "2.1"',
        'description: Welt – made with ResourcepackBuilder',
        'enable: false',
        'subpacks:',
        '  $$>=1.21.4:',
        '    modern: true',
        '  legacy: false',
        '',
      ].join('\n'),
    );
  });

  it('keeps the defaults without project values', () => {
    const { project } = ceProject();
    expect(pluginText(planExport(project), `${PACK}/pack.yml`)).toContain('author: ResourcepackBuilder\nversion: "1.0"\n');
  });
});

describe('CraftEngine config factories', () => {
  it('writes each factory as its own config_factory section', () => {
    const { project } = ceProject({
      configFactories: [
        {
          id: 'sofa',
          blueprint: { items: { 'welt:${color}_sofa': { material: 'paper' } } },
          instances: [{ color: 'white' }, { color: 'red' }],
        },
        { id: 'empty', blueprint: { items: {} } },
      ],
    });
    const plan = planExport(project);
    expect(pluginText(plan, `${CONFIG}/config_factories.yml`)).toBe(
      [
        '# Created with ResourcepackBuilder – config factories of "Welt"',
        'config_factory#sofa:',
        '  blueprint:',
        '    items:',
        '      welt:${color}_sofa:',
        '        material: paper',
        '  instances:',
        '    - color: white',
        '    - color: red',
        '',
      ].join('\n'),
    );
    expect(codes(project)).toContain('ce.configFactoryInstancesMissing');
  });
});

describe('CraftEngine scripts', () => {
  it('writes each script into the pack script folder and reports bad paths', () => {
    const { project } = ceProject({
      scripts: [
        { path: 'combo', source: 'function onRightClick() {}' },
        { path: 'utils/math.js', source: 'function add(a, b) { return a + b; }\n' },
        { path: 'Bad Path', source: 'x' },
        { path: 'combo', source: 'taken' },
        { path: 'utils/../../evil', source: 'x' },
        { path: './x', source: 'x' },
      ],
    });
    const plan = planExport(project);
    expect(pluginText(plan, `${PACK}/script/combo.js`)).toBe('function onRightClick() {}\n');
    expect(pluginText(plan, `${PACK}/script/utils/math.js`)).toBe('function add(a, b) { return a + b; }\n');
    expect([...plan.pluginFiles.keys()].filter((path) => path.includes('/script/'))).toHaveLength(2);
    expect(plan.issues.filter((issue) => issue.code === 'ce.scriptPathInvalid').map((issue) => issue.args?.path)).toEqual([
      'Bad Path',
      'utils/../../evil',
      './x',
    ]);
    expect(codes(project)).toEqual(expect.arrayContaining(['ce.scriptPathInvalid', 'ce.scriptPathDuplicate', 'ce.scriptsNeedScripting']));
  });
});
