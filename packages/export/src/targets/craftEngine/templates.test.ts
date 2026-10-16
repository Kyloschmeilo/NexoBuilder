import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  type ConfigObject,
  createFolder,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Item,
  type Project,
} from '@resourcepackbuilder/core/project';
import { newCraftEngineBlock } from '@resourcepackbuilder/core/craftEngine';
import { createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const PNG16 = makePngDataUrl(16, 16);
const ITEMS = 'resources/vorlagen/configuration/items/dinge/dinge.yml';
const TEMPLATES = 'resources/vorlagen/configuration/templates.yml';
const GLOBAL_VARIABLES = 'resources/vorlagen/configuration/global_variables.yml';

/** A CraftEngine project with one item per edit, in the folder "Dinge". */
function templateProject(craftEngine: Project['craftEngine'], ...edits: Array<[string, (item: Item) => void]>): Project {
  const project = createProject('Vorlagen', 'vorlagen', '26.3', 'craftengine');
  if (craftEngine) project.craftEngine = craftEngine;
  const folder = createFolder('Dinge', null);
  insertFolder(project, folder);
  for (const [itemId, edit] of edits) {
    const item = createItem({
      displayName: itemId,
      itemId,
      folderId: folder.id,
      material: 'PAPER',
      model: createTextureModel('generated', { layer0: 'thing.png' }, [{ name: 'thing.png', dataUrl: PNG16 }]),
    });
    edit(item);
    insertItem(project, item);
  }
  return project;
}

const parsed = (project: Project, file: string) => parse(pluginText(planExport(project), file)) as Record<string, Record<string, unknown>>;
/** The issues besides the empty folder of the projects without items */
const issues = (project: Project) =>
  planExport(project)
    .issues.filter((i) => i.code !== 'plan.folderEmpty')
    .map((i) => ({ code: i.code, args: i.args, context: i.context?.map((c) => c.code) }));

const ORE_TEMPLATE: ConfigObject = {
  id: 'ore_settings',
  arguments: [{ name: 'hardness', default: '4.5' }, { name: 'power' }],
  body: { template: ['default:sound/stone'], overrides: { hardness: '${hardness}', required_break_power: '${power}' } },
};

describe('CraftEngine templates and global variables', () => {
  it('writes the templates to templates.yml and the global variables to global_variables.yml', () => {
    const project = templateProject({ templates: [ORE_TEMPLATE], globalVariables: { rare_tag: '<gold>[Rare]' } });
    expect(parsed(project, TEMPLATES)).toEqual({
      templates: {
        'vorlagen:ore_settings': {
          template: ['default:sound/stone'],
          overrides: { hardness: '${hardness:-4.5}', required_break_power: '${power}' },
        },
      },
    });
    expect(parsed(project, GLOBAL_VARIABLES)).toEqual({ global_variables: { rare_tag: '<gold>[Rare]' } });
    expect(issues(project)).toEqual([]);
  });

  it('writes neither file without templates or global variables', () => {
    const files = [...planExport(templateProject(undefined)).pluginFiles.keys()];
    expect(files.filter((path) => path.endsWith('templates.yml') || path.endsWith('global_variables.yml'))).toEqual([]);
  });

  it('writes the template uses of the block settings and the item as they are', () => {
    const project = templateProject({ templates: [ORE_TEMPLATE] }, [
      'ruby_ore',
      (item) => {
        item.config.template = ['vorlagen:ore_settings'];
        item.config.arguments = { power: '2' };
        item.config.block = {
          ...newCraftEngineBlock(),
          settings: { template: ['default:settings/ore'], arguments: { break_power: '2' }, luminance: 3 },
        };
      },
    ]);
    const blocks = parsed(project, ITEMS).blocks as Record<string, Record<string, unknown>>;
    expect(blocks['vorlagen:ruby_ore'].settings).toEqual({
      template: ['default:settings/ore'],
      arguments: { break_power: '2' },
      luminance: 3,
    });
    const items = parsed(project, ITEMS).items as Record<string, Record<string, unknown>>;
    expect(items['vorlagen:ruby_ore']).toMatchObject({ template: ['vorlagen:ore_settings'], arguments: { power: '2' } });
    expect(issues(project)).toEqual([]);
  });

  it('reports unknown templates and missing required arguments', () => {
    const project = templateProject({ templates: [ORE_TEMPLATE] }, [
      'ruby_ore',
      (item) => {
        item.config.template = ['vorlagen:ore_settings'];
        item.config.block = { ...newCraftEngineBlock(), settings: { template: ['default:settings/ore', 'default:settings/nope'] } };
      },
    ]);
    expect(issues(project)).toEqual([
      { code: 'ce.templateArgumentMissing', args: { template: 'vorlagen:ore_settings', argument: 'power' }, context: ['context.item'] },
      {
        code: 'ce.templateArgumentMissing',
        args: { template: 'default:settings/ore', argument: 'break_power' },
        context: ['context.item'],
      },
      { code: 'ce.templateUnknown', args: { template: 'default:settings/nope' }, context: ['context.item'] },
    ]);
  });

  it('reports templates without id, with a bad or taken id, without body or using unknown templates, and bad variable names', () => {
    const project = templateProject({
      templates: [
        { id: '', body: { a: 1 } },
        { id: 'Bad Id', body: { a: 1 } },
        { id: 'twice', body: { a: 1 } },
        { id: 'vorlagen:twice', body: { a: 2 } },
        { id: 'empty' },
        { id: 'uses', body: { template: 'vorlagen:missing' } },
      ],
      globalVariables: { 'has space': 'x' },
    });
    expect(issues(project)).toEqual([
      { code: 'ce.templateIdMissing', args: undefined, context: ['context.listEntry'] },
      { code: 'ce.templateIdInvalid', args: { id: 'Bad Id' }, context: ['context.template'] },
      { code: 'ce.templateIdDuplicate', args: { id: 'vorlagen:twice' }, context: ['context.template'] },
      { code: 'ce.templateBodyMissing', args: undefined, context: ['context.template'] },
      { code: 'ce.templateUnknown', args: { template: 'vorlagen:missing' }, context: ['context.template'] },
      { code: 'ce.globalVariableNameInvalid', args: { name: 'has space' }, context: undefined },
    ]);
  });

  it('has the template argument messages in English and German', () => {
    for (const locale of ['en', 'de']) {
      const url = new URL(`../../../../i18n/src/messages/${locale}/issues.json`, import.meta.url);
      const ce = (JSON.parse(readFileSync(url, 'utf8')) as { ce: Record<string, string> }).ce;
      expect(ce.templateUnknown).toContain('{template}');
      expect(ce.templateArgumentMissing).toContain('{template}');
      expect(ce.templateArgumentMissing).toContain('{argument}');
    }
  });
});
