import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  createFolder,
  createGlyph,
  createItem,
  createProject,
  insertFolder,
  insertItem,
  type Project,
} from '@resourcepackbuilder/core/project';
import { createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from './plan';
import { countSelected, planMultiExport, selectFromProject, selectNothing } from './selection';
import { buildMultiExportZip, INSTALL_GUIDE_FILE, listMultiExportPaths } from './zip';
import { singleExport } from '../test-utils/export';

const PNG16 = makePngDataUrl(16, 16);

function project(name: string, ns: string, ids: { weapons: string[]; furniture: string[] }, target: Project['target'] = 'nexo'): Project {
  const p = createProject(name, ns, undefined, target);
  const weapons = createFolder('Waffen', null);
  const furniture = createFolder('Möbel', null);
  const chairs = createFolder('Stühle', furniture.id);
  insertFolder(p, weapons);
  insertFolder(p, furniture);
  insertFolder(p, chairs);
  for (const id of ids.weapons) {
    const model = createTextureModel('handheld', { layer0: `${id}.png` }, [{ name: `${id}.png`, dataUrl: PNG16 }]);
    insertItem(p, createItem({ displayName: id, itemId: id, folderId: weapons.id, model }));
  }
  for (const id of ids.furniture) insertItem(p, createItem({ displayName: id, itemId: id, folderId: chairs.id, model: null }));
  p.glyphs = [createGlyph('g1', 'herz', { name: 'herz.png', dataUrl: PNG16, width: 16, height: 16 })];
  return p;
}

const itemId = (p: Project, itemId: string) => Object.values(p.items).find((i) => i.itemId === itemId)!.id;

describe('Export selection within a project', () => {
  it('exports only the selected items and omits empty folders', () => {
    const p = project('Mein Pack', 'meinpack', { weapons: ['ruby_sword', 'axe'], furniture: ['chair'] });
    const selection = { excludedItemIds: [itemId(p, 'axe'), itemId(p, 'chair')], excludedGlyphIds: ['g1'] };
    const subset = selectFromProject(p, selection);
    expect(Object.values(subset.items).map((i) => i.itemId)).toEqual(['ruby_sword']);
    expect(Object.values(subset.folders).map((f) => f.name)).toEqual(['Waffen']);
    expect(subset.glyphs).toEqual([]);
    expect(countSelected(p, selection)).toEqual({ items: 1, glyphs: 0, sounds: 0, paintings: 0 });

    const plan = planExport(subset);
    const paths = listMultiExportPaths(singleExport(subset, plan), 'full');
    expect(paths).toContain('items/waffen/waffen.yml');
    expect(paths).toContain('pack/external_packs/mein_pack/assets/meinpack/models/item/waffen/ruby_sword.json');
    expect(paths.some((x) => x.includes('axe'))).toBe(false);
    expect(paths.some((x) => x.includes('moebel'))).toBe(false);
    expect(paths.some((x) => x.startsWith('glyphs/'))).toBe(false);
    // no message about folders that are only empty because of the selection
    expect(plan.issues.some((i) => i.code === 'plan.folderEmpty')).toBe(false);
    // The original stays unchanged
    expect(Object.keys(p.items)).toHaveLength(3);
  });

  it('keeps paths of subfolders even if the parent folder itself has no items', () => {
    const p = project('Mein Pack', 'meinpack', { weapons: ['ruby_sword'], furniture: ['chair'] });
    const subset = selectFromProject(p, { excludedItemIds: [itemId(p, 'ruby_sword')], excludedGlyphIds: [] });
    const plan = planExport(subset);
    expect([...plan.pluginFiles.keys()].filter((path) => path.startsWith('items/'))).toEqual(['items/moebel/stuehle/stuehle.yml']);
  });

  it('returns the unchanged project without a selection', () => {
    const p = project('A', 'a', { weapons: ['x'], furniture: [] });
    expect(selectFromProject(p, undefined)).toBe(p);
    expect(selectFromProject(p, { excludedItemIds: [], excludedGlyphIds: [] })).toBe(p);
  });

  it('selects nothing', () => {
    const p = project('A', 'a', { weapons: ['x'], furniture: ['chair'] });
    expect(countSelected(p, selectNothing(p))).toEqual({ items: 0, glyphs: 0, sounds: 0, paintings: 0 });
  });
});

describe('Export of multiple projects', () => {
  it('packs multiple projects into one ZIP with a separate folder and pack per project', async () => {
    const a = project('Waffen Pack', 'waffenpack', { weapons: ['ruby_sword'], furniture: [] });
    const b = project('Deko', 'deko', { weapons: ['deko_axe'], furniture: ['chair'] });
    b.glyphs[0].glyphId = 'stern';
    const multi = planMultiExport([{ project: a }, { project: b }], { includeBinaries: true });
    expect(multi.issues.filter((i) => i.level === 'error')).toEqual([]);
    const paths = listMultiExportPaths(multi, 'full');
    expect(paths).toContain('items/waffen_pack/waffen/waffen.yml');
    expect(paths).toContain('items/deko/waffen/waffen.yml');
    expect(paths).toContain('items/deko/moebel/stuehle/stuehle.yml');
    expect(paths).toContain('glyphs/waffen_pack.yml');
    expect(paths).toContain('glyphs/deko.yml');
    expect(paths).toContain('pack/external_packs/waffen_pack/pack.mcmeta');
    expect(paths).toContain('pack/external_packs/deko/pack.mcmeta');
    expect(paths).toContain(INSTALL_GUIDE_FILE);

    const result = await buildMultiExportZip(multi, 'full');
    expect(result.fileName).toBe('resourcepackbuilder_2_projects_nexo.zip');
    const zip = await JSZip.loadAsync(result.data);
    const files = Object.keys(zip.files)
      .filter((f) => !zip.files[f].dir)
      .sort();
    expect(files).toEqual(paths);
    const guide = await zip.file(INSTALL_GUIDE_FILE)!.async('string');
    expect(guide).toContain('Project "Waffen Pack"');
    expect(guide).toContain('  - deko_axe');

    const packs = listMultiExportPaths(multi, 'pack');
    expect(packs).toContain('waffen_pack/pack.mcmeta');
    expect(packs).toContain('deko/pack.mcmeta');
  });

  it('reports duplicate item IDs, glyphs, pack names and identical files between projects', () => {
    const a = project('Pack', 'shared', { weapons: ['ruby_sword'], furniture: [] });
    const b = project('Pack', 'shared', { weapons: ['ruby_sword'], furniture: [] });
    const multi = planMultiExport([{ project: a }, { project: b }]);
    const errors = multi.issues.filter((i) => i.level === 'error' && !i.projectId);
    expect(errors.some((i) => i.code === 'selection.itemIdClash' && i.args?.id === 'ruby_sword')).toBe(true);
    expect(errors.some((i) => i.code === 'selection.glyphIdClash' && i.args?.id === 'herz')).toBe(true);
    expect(errors.some((i) => i.code === 'selection.packNameClash' && i.args?.pack === 'pack')).toBe(true);
    expect(errors.some((i) => i.code === 'selection.pluginFileClash' && i.args?.path === 'items/pack/waffen/waffen.yml')).toBe(true);
    const warnings = multi.issues.filter((i) => i.level === 'warning' && !i.projectId);
    expect(
      warnings.some((i) => i.code === 'selection.assetFileClash' && i.args?.path === 'assets/shared/models/item/waffen/ruby_sword.json'),
    ).toBe(true);
  });

  it('compares item IDs by their YAML key and only within the same target', () => {
    const clashes = (a: Project, b: Project) =>
      planMultiExport([{ project: a }, { project: b }]).issues.filter((i) => i.code === 'selection.itemIdClash');
    // CraftEngine keys carry the namespace, so the same ID in two namespaces is fine
    const ceA = project('Alpha', 'alpha', { weapons: ['ruby_sword'], furniture: [] }, 'craftengine');
    const ceB = project('Beta', 'beta', { weapons: ['ruby_sword'], furniture: [] }, 'craftengine');
    expect(clashes(ceA, ceB)).toEqual([]);
    // Nexo and CraftEngine never share a registry
    const nexo = project('Gamma', 'gamma', { weapons: ['ruby_sword'], furniture: [] });
    expect(clashes(nexo, ceA)).toEqual([]);
    // The same namespaced key within CraftEngine still clashes
    const ceC = project('Delta', 'alpha', { weapons: ['ruby_sword'], furniture: [] }, 'craftengine');
    expect(clashes(ceA, ceC).map((i) => i.args?.id)).toEqual(['alpha:ruby_sword']);
    // Two Nexo projects with the same ID still clash
    const nexo2 = project('Epsilon', 'epsilon', { weapons: ['ruby_sword'], furniture: [] });
    expect(clashes(nexo, nexo2).map((i) => i.args?.id)).toEqual(['ruby_sword']);
  });

  it('tags messages with the project', () => {
    const a = project('Alpha', 'alpha', { weapons: ['a1'], furniture: [] });
    const b = project('Beta', 'beta', { weapons: [], furniture: ['b1'] });
    b.glyphs = [];
    const multi = planMultiExport([{ project: a }, { project: b }]);
    const info = multi.issues.find((i) => i.projectId === b.id && i.target?.kind === 'item');
    expect(info?.context?.[0]).toEqual({ code: 'context.project', args: { project: 'Beta' } });
    expect(info?.context?.[1]?.code).toBe('context.item');
  });

  it('behaves exactly like the normal export with a single project', () => {
    const a = project('Alpha', 'alpha', { weapons: ['a1'], furniture: ['a2'] });
    const multi = planMultiExport([{ project: a }]);
    expect(listMultiExportPaths(multi, 'full')).toEqual(listMultiExportPaths(singleExport(a, planExport(a)), 'full'));
    expect(multi.issues.every((i) => !i.projectId)).toBe(true);
  });
});
