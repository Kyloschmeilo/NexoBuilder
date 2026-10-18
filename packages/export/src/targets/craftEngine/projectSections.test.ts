/**
 * The project-level CraftEngine sections: server translations, free lang keys and block names, categories,
 * worldgen features, atlases, pack.yml, config factories and script files.
 */
import { describe, expect, it } from 'vitest';
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
    expect(codes(project)).toContain('ce.categoryIdMissing');
  });

  it('reports bad and taken category ids', () => {
    const { project } = ceProject({ categories: [{ id: 'Bad Id' }, { id: 'a' }, { id: 'welt:a' }] });
    expect(codes(project)).toEqual(expect.arrayContaining(['ce.categoryIdInvalid', 'ce.categoryIdDuplicate']));
  });

  it('writes no categories.yml without categories', () => {
    const { project } = ceProject();
    expect(planExport(project).pluginFiles.has(`${CONFIG}/categories.yml`)).toBe(false);
  });
});
