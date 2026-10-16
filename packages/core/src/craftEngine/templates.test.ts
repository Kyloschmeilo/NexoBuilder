import { describe, expect, it } from 'vitest';
import { createProject, migrateProject, type Project } from '../project';
import { CE_DEFAULT_TEMPLATES } from './defaultTemplates';
import { templateArgumentNames, templatePlaceholders } from './templateArgs';
import {
  craftEngineGlobalVariables,
  craftEngineTemplates,
  projectTemplateOptions,
  resolveGlobalVariables,
  templateBodyWithDefaults,
  templateLookup,
  templateUseIssues,
} from './templates';

function templateProject(craftEngine: Project['craftEngine']): Project {
  const project = createProject('Burg', 'burg', '26.3', 'craftengine');
  if (craftEngine) project.craftEngine = craftEngine;
  return project;
}

describe('template placeholders', () => {
  it('reads names, defaults, case suffixes, nested braces and escapes as CraftEngine does', () => {
    const found = templatePlaceholders('a${x}b${y:-3.0}${z^^}${w:-"${x}"}\\${no}${open');
    expect(found.map(({ name, suffix, defaultText }) => ({ name, suffix, defaultText }))).toEqual([
      { name: 'x', suffix: '', defaultText: undefined },
      { name: 'y', suffix: '', defaultText: '3.0' },
      { name: 'z', suffix: '^^', defaultText: undefined },
      { name: 'w', suffix: '', defaultText: '"${x}"' },
    ]);
  });

  it('tells required from optional arguments, through nested templates and the arguments they get', () => {
    const nested = (id: string) => (id === 'a:inner' ? { required: ['inner_arg', 'passed'], optional: ['opt'] } : undefined);
    const body = {
      hardness: '${hardness:-2}',
      '${key}': ['${__ID__}', '${listed}'],
      sub: { template: 'a:inner', arguments: { passed: '${outer}' } },
    };
    expect(templateArgumentNames(body, nested)).toEqual({
      required: ['inner_arg', 'key', 'listed', 'outer'],
      optional: ['hardness', 'opt', 'passed'],
    });
  });

  it('lists the default templates of the jar with their arguments', () => {
    expect(CE_DEFAULT_TEMPLATES).toHaveLength(69);
    const ore = CE_DEFAULT_TEMPLATES.find((t) => t.id === 'default:settings/ore');
    expect(ore).toMatchObject({ file: 'block_settings', required: ['break_power'], optional: ['block_type', 'hardness', 'resistance'] });
    expect(CE_DEFAULT_TEMPLATES.find((t) => t.id === 'default:loot_table/furniture')?.required).toEqual(['item']);
    // `arguments::block_type` in the jar passes the argument the nested template needs
    expect(CE_DEFAULT_TEMPLATES.find((t) => t.id === 'default:sound/stone')?.required).toBeUndefined();
    expect(CE_DEFAULT_TEMPLATES.every((t) => t.id.startsWith('default:'))).toBe(true);
  });
});

describe('project templates', () => {
  const project = templateProject({
    templates: [
      {
        id: 'ore',
        arguments: [{ name: 'hardness', default: '3.0' }, { name: 'tool', default: 'minecraft:iron {x}' }, { name: 'power' }],
        body: { hardness: '${hardness}', tool: '${tool^}', required_break_power: '${power}', resistance: '${hardness:-1}' },
      },
      { id: 'other:bare', body: ['${a}'] },
      { id: 'ore', body: { taken: true } },
      { id: '', body: { no: 'id' } },
      { id: 'empty' },
    ],
    globalVariables: { rare_tag: '<gold>[Rare]', 'bad name': 'x' },
  });

  it('writes the templates under their key, with the declared defaults in the placeholders', () => {
    expect(craftEngineTemplates(project)).toEqual({
      'burg:ore': {
        hardness: '${hardness:-3.0}',
        tool: "${tool^:-'minecraft:iron \\{x\\}'}",
        required_break_power: '${power}',
        resistance: '${hardness:-1}',
      },
      'other:bare': ['${a}'],
    });
    expect(projectTemplateOptions(project).map((o) => o.value)).toEqual(['burg:ore', 'other:bare']);
  });

  it('writes defaults as SNBT: numbers, booleans and quoted text as they are, other text quoted', () => {
    const body = templateBodyWithDefaults('${a}${b}${c}${d}', [
      { name: 'a', default: '2' },
      { name: 'b', default: 'true' },
      { name: 'c', default: "'x'" },
      { name: 'd', default: "it's" },
    ]);
    expect(body).toBe("${a:-2}${b:-true}${c:-'x'}${d:-'it\\'s'}");
  });

  it('needs the arguments without a default, declared or used', () => {
    const lookup = templateLookup(project);
    expect(lookup('burg:ore')).toEqual({ required: ['power'], optional: ['hardness', 'tool'] });
    expect(lookup('other:bare')).toEqual({ required: ['a'], optional: [] });
    expect(lookup('default:settings/ore')?.required).toEqual(['break_power']);
    expect(lookup('burg:missing')).toBeUndefined();
  });

  it('finds unknown templates and missing arguments in a config', () => {
    const lookup = templateLookup(project);
    const config = {
      template: 'burg:ore',
      block: {
        settings: { template: ['default:sound/stone', 'default:settings/ore'], arguments: { hardness: 2 } },
        loot: { template: 'default:loot_table/basic', arguments: { item: 'burg:x' } },
      },
      furniture: { events: [{ template: 'burg:nope' }, { template: '${dynamic}' }] },
    };
    expect(templateUseIssues(config, lookup)).toEqual([
      { code: 'ce.templateArgumentMissing', args: { template: 'burg:ore', argument: 'power' } },
      // The item's arguments would reach the block's uses; it passes none
      { code: 'ce.templateArgumentMissing', args: { template: 'default:settings/ore', argument: 'break_power' } },
      { code: 'ce.templateUnknown', args: { template: 'burg:nope' } },
    ]);
    // Arguments of the use around it count
    expect(
      templateUseIssues({ template: 'other:bare', arguments: { a: 1 }, overrides: { x: { template: 'other:bare' } } }, lookup),
    ).toEqual([]);
  });

  it('writes the global variables with a name CraftEngine can read, and fills them into previews', () => {
    expect(craftEngineGlobalVariables(project)).toEqual({ rare_tag: '<gold>[Rare]' });
    expect(resolveGlobalVariables('<global:rare_tag> Sword <global:unknown>', { rare_tag: '<gold>[Rare]' })).toBe(
      '<gold>[Rare] Sword <global:unknown>',
    );
  });

  it('reads stored templates and global variables leniently', () => {
    const migrated = migrateProject({
      name: 'Burg',
      target: 'craftengine',
      craftEngine: { templates: [5, { id: 'a', body: { x: 1 } }], globalVariables: { ok: 'x', bad: 5 } },
    });
    expect(migrated.craftEngine).toEqual({ templates: [{ id: 'a', body: { x: 1 } }], globalVariables: { ok: 'x' } });
  });
});
