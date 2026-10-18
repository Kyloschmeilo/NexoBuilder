/** The output providers of the dock: the file and checks each page kind shows, and pages that write no file. */
import { describe, expect, it } from 'vitest';
import {
  addMediaEntry,
  createDialog,
  createFolder,
  createItem,
  createProject,
  createSound,
  insertFolder,
  insertItem,
  type PackTargetId,
  type Project,
} from '@resourcepackbuilder/core/project';
import { packTargetFor, packYmlFile, planExport } from '@resourcepackbuilder/export';
import { outputFor, pageOutput, VIEW_OUTPUTS } from './output';
import { CRAFT_ENGINE_VIEW_NAMES, MEDIA_VIEW_NAMES } from './sidebar/ViewEntries';

function sampleProject(target: PackTargetId): { project: Project; folderId: string; itemId: string } {
  const project = createProject('Demo', 'demo', undefined, target);
  const folder = createFolder('Weapons', null);
  insertFolder(project, folder);
  const item = createItem({ displayName: 'Fire Sword', itemId: 'fire_sword', folderId: folder.id, model: null });
  insertItem(project, item);
  return { project, folderId: folder.id, itemId: item.id };
}

describe('outputFor', () => {
  for (const target of ['nexo', 'craftengine'] as const) {
    it(`shows the item's YAML and file for a ${target} item`, () => {
      const { project, itemId } = sampleProject(target);
      const plan = planExport(project, { includeBinaries: false });
      const output = outputFor(project, plan, { kind: 'item', id: itemId });
      expect(output?.file).toBe(plan.items[0]?.yamlFile);
      expect(output?.text).toContain('fire_sword');
    });

    it(`shows the file of a ${target} folder's items`, () => {
      const { project, folderId } = sampleProject(target);
      const plan = planExport(project, { includeBinaries: false });
      const output = outputFor(project, plan, { kind: 'folder', id: folderId });
      expect(output?.file).toBe(plan.items[0]?.yamlFile);
      expect(output?.text).toContain('fire_sword');
    });

    it(`shows the media config file of each ${target} media view`, () => {
      const { project } = sampleProject(target);
      const plan = planExport(project, { includeBinaries: false });
      expect(outputFor(project, plan, { kind: 'view', view: 'glyphs' })?.file).toBe(
        packTargetFor(project).layout.mediaFile(project, 'glyph'),
      );
      expect(outputFor(project, plan, { kind: 'view', view: 'sounds' })?.file).toBe(
        packTargetFor(project).layout.mediaFile(project, 'sound'),
      );
    });
  }

  it('shows pack.yml on the settings page of a CraftEngine project and nothing for Nexo', () => {
    const ce = sampleProject('craftengine').project;
    const cePlan = planExport(ce, { includeBinaries: false });
    const output = outputFor(ce, cePlan, { kind: 'settings' });
    expect(output?.file).toBe(packYmlFile(ce));
    expect(output?.text).not.toBe('');
    const nexo = sampleProject('nexo').project;
    expect(outputFor(nexo, planExport(nexo, { includeBinaries: false }), { kind: 'settings' })).toBeNull();
  });

  it('gives the test server, a missing entry, no selection and no plan no output', () => {
    const { project } = sampleProject('nexo');
    const plan = planExport(project, { includeBinaries: false });
    expect(outputFor(project, plan, { kind: 'view', view: 'testServer' })).toBeNull();
    expect(outputFor(project, plan, { kind: 'item', id: 'gone' })).toBeNull();
    expect(outputFor(project, plan, null)).toBeNull();
    expect(outputFor(project, null, { kind: 'settings' })).toBeNull();
  });

  it('narrows the checks of a media view to the selected entry', () => {
    const { project } = sampleProject('nexo');
    project.sounds.push(createSound('s1', 'click', []), createSound('s2', 'clack', []));
    const plan = planExport(project, { includeBinaries: false });
    const all = outputFor(project, plan, { kind: 'view', view: 'sounds' });
    const one = outputFor(project, plan, { kind: 'view', view: 'sounds', entry: 's2' });
    expect(all?.issues.some((issue) => issue.target?.id === 's1')).toBe(true);
    expect(one?.issues.length).toBeGreaterThan(0);
    expect(one?.issues.every((issue) => issue.target?.kind === 'sound' && issue.target.id === 's2')).toBe(true);
    expect(one?.file).toBe(all?.file);
  });

  it('shows the lang file of a selected lang locale and translations.yml for a server locale', () => {
    const { project } = sampleProject('craftengine');
    project.craftEngine = { lang: { de_de: { greeting: 'Hallo' } }, translations: { en: { hi: 'Hi' } } };
    const plan = planExport(project, { includeBinaries: false });
    const lang = outputFor(project, plan, { kind: 'view', view: 'translations', entry: 'lang/de_de' });
    expect(lang?.file).toMatch(/configuration\/lang\/de_de\.yml$/);
    expect(lang?.text).toContain('Hallo');
    const server = outputFor(project, plan, { kind: 'view', view: 'translations', entry: 'server/en' });
    expect(server?.file).toMatch(/configuration\/translations\.yml$/);
  });

  it('shows the dialog files of a Nexo project and nothing for CraftEngine', () => {
    const { project } = sampleProject('nexo');
    addMediaEntry(project, 'dialog', 'Welcome', createDialog);
    addMediaEntry(project, 'dialog', 'Rules', createDialog);
    project.dialogs[1].config = { type: 'MULTI' };
    const output = outputFor(project, planExport(project, { includeBinaries: false }), { kind: 'view', view: 'dialogs' });
    expect(output?.file).toBe('dialogs/');
    expect(output?.text).toContain(['# dialogs/welcome.yml', 'type: NOTICE'].join('\n'));
    expect(output?.text).toContain(['# dialogs/rules.yml', 'type: MULTI'].join('\n'));
    expect(output?.issues.map((issue) => issue.code)).toEqual(['dialog.actionsMissing']);
    const ce = sampleProject('craftengine').project;
    expect(outputFor(ce, planExport(ce, { includeBinaries: false }), { kind: 'view', view: 'dialogs' })).toBeNull();
  });

  it('shows multipack.yml of a Nexo project with its checks', () => {
    const { project } = sampleProject('nexo');
    project.settings.multipack = { templates: { music: { conflicts_with: 'loud' } } };
    const output = outputFor(project, planExport(project, { includeBinaries: false }), { kind: 'view', view: 'multipack' });
    expect(output?.file).toBe('multipack.yml');
    expect(output?.text).toContain('conflicts_with: loud');
    expect(output?.issues.map((issue) => issue.code)).toEqual(['multipack.unknownTemplate']);
  });

  it('shows the id checks of each CraftEngine section only in that section', () => {
    const { project } = sampleProject('craftengine');
    project.craftEngine = {
      categories: [{ id: 'Bad Id' }, {}],
      configuredFeatures: [
        { id: 'Bad Feature', type: 'minecraft:ore', config: {} },
        { type: 'minecraft:ore', config: {} },
      ],
      atlases: [{}],
    };
    const plan = planExport(project, { includeBinaries: false });
    const sectionChecks = (view: 'categories' | 'worldgen' | 'atlases') =>
      outputFor(project, plan, { kind: 'view', view })
        ?.issues.filter((issue) => issue.code.startsWith('ce.sectionEntryId'))
        .map((issue) => issue.context?.[0]);
    expect(sectionChecks('categories')).toEqual([
      { code: 'context.category', args: { id: 'Bad Id' } },
      { code: 'context.listEntry', args: { index: 2, section: 'category' } },
    ]);
    expect(sectionChecks('worldgen')).toEqual([
      { code: 'context.configuredFeature', args: { id: 'Bad Feature' } },
      { code: 'context.listEntry', args: { index: 2, section: 'configuredFeature' } },
    ]);
    expect(sectionChecks('atlases')).toEqual([{ code: 'context.listEntry', args: { index: 1, section: 'atlas' } }]);
  });

  it('has a provider for every registry view', () => {
    expect([...MEDIA_VIEW_NAMES, ...CRAFT_ENGINE_VIEW_NAMES].filter((view) => !VIEW_OUTPUTS[view])).toEqual([]);
  });
});

describe('pageOutput', () => {
  it('builds the output once for the same project, plan and selection', () => {
    const { project, itemId } = sampleProject('nexo');
    const plan = planExport(project, { includeBinaries: false });
    const selection = { kind: 'item', id: itemId } as const;
    const first = pageOutput(project, plan, selection);
    expect(pageOutput(project, plan, selection)).toBe(first);
    expect(pageOutput(project, plan, { kind: 'item', id: itemId })).not.toBe(first);
  });
});
