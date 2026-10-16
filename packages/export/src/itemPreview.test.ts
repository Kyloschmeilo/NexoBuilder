import { describe, expect, it } from 'vitest';
import { parseRawYaml } from '@resourcepackbuilder/core/yaml';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '@resourcepackbuilder/core/project';
import { findItemPlan, itemYamlPreview } from './itemPreview';
import { nexoPluginPath } from './targets';
import { planExport } from './plan';

describe('item preview', () => {
  it('shows the final YAML of a planned item', () => {
    const project = createProject('Test', 'pack');
    const folder = createFolder('Weapons', null);
    insertFolder(project, folder);
    const item = createItem({ displayName: 'Ruby', itemId: 'ruby', folderId: folder.id, model: null });
    item.rawYaml = 'Mechanics:\n  custom: true';
    insertItem(project, item);
    const plan = planExport(project);
    expect(findItemPlan(plan, item.id)?.yamlFile).toMatch(/^items\//);
    const yaml = itemYamlPreview(plan, item.id);
    expect(yaml).toMatch(/^ruby:/);
    expect(yaml).toContain('custom: true');
    expect(itemYamlPreview(null, item.id)).toBe('');
  });

  it('places paths inside the Nexo plugin folder', () => {
    expect(nexoPluginPath('sounds.yml')).toBe('plugins/Nexo/sounds.yml');
  });
});

describe('raw YAML', () => {
  it('accepts blank text and mappings', () => {
    expect(parseRawYaml('  ')).toEqual({ value: null, error: null });
    expect(parseRawYaml('a: 1')).toEqual({ value: { a: 1 }, error: null });
  });

  it('rejects lists and broken YAML', () => {
    expect(parseRawYaml('- a').error).toEqual({ kind: 'notAMapping' });
    expect(parseRawYaml('a: [').error?.kind).toBe('syntax');
  });
});
