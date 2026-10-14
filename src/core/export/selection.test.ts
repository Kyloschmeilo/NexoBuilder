import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import { createTextureModel } from '../model/textureModel';
import { createGlyph } from '../nexo/glyphs';
import { makePngDataUrl } from '../../test/png';
import { planExport } from './plan';
import { countSelected, planMultiExport, selectFromProject } from './selection';
import { buildMultiExportZip, listExportPaths, listMultiExportPaths } from './zip';
import type { Project } from '../types';

const PNG16 = makePngDataUrl(16, 16);

function project(name: string, ns: string, ids: { waffen: string[]; moebel: string[] }): Project {
  const p = createProject(name, ns);
  const waffen = createFolder('Waffen', null);
  const moebel = createFolder('Möbel', null);
  const stuehle = createFolder('Stühle', moebel.id);
  insertFolder(p, waffen);
  insertFolder(p, moebel);
  insertFolder(p, stuehle);
  for (const id of ids.waffen) {
    const model = createTextureModel('handheld', { layer0: `${id}.png` }, [{ name: `${id}.png`, dataUrl: PNG16 }]);
    insertItem(p, createItem({ displayName: id, nexoId: id, folderId: waffen.id, model }));
  }
  for (const id of ids.moebel) insertItem(p, createItem({ displayName: id, nexoId: id, folderId: stuehle.id, model: null }));
  p.glyphs = [createGlyph('g1', 'herz', { name: 'herz.png', dataUrl: PNG16, width: 16, height: 16 })];
  return p;
}

const itemId = (p: Project, nexoId: string) => Object.values(p.items).find((i) => i.nexoId === nexoId)!.id;

describe('Export-Auswahl in einem Projekt', () => {
  it('exportiert nur die ausgewählten Items und lässt leere Ordner weg', () => {
    const p = project('Mein Pack', 'meinpack', { waffen: ['ruby_sword', 'axe'], moebel: ['chair'] });
    const selection = { excludedItemIds: [itemId(p, 'axe'), itemId(p, 'chair')], excludedGlyphIds: ['g1'] };
    const subset = selectFromProject(p, selection);
    expect(Object.values(subset.items).map((i) => i.nexoId)).toEqual(['ruby_sword']);
    expect(Object.values(subset.folders).map((f) => f.name)).toEqual(['Waffen']);
    expect(subset.glyphs).toEqual([]);
    expect(countSelected(p, selection)).toEqual({ items: 1, glyphs: 0 });

    const plan = planExport(subset);
    const paths = listExportPaths(subset, plan, 'full');
    expect(paths).toContain('items/waffen/waffen.yml');
    expect(paths).toContain('pack/external_packs/mein_pack/assets/meinpack/models/item/waffen/ruby_sword.json');
    expect(paths.some((x) => x.includes('axe'))).toBe(false);
    expect(paths.some((x) => x.includes('moebel'))).toBe(false);
    expect(paths.some((x) => x.startsWith('glyphs/'))).toBe(false);
    // keine Meldung über leere Ordner, die nur wegen der Auswahl leer sind
    expect(plan.issues.some((i) => i.message.includes('ist leer'))).toBe(false);
    // Das Original bleibt unverändert
    expect(Object.keys(p.items)).toHaveLength(3);
  });

  it('behält Pfade von Unterordnern, auch wenn der Elternordner selbst keine Items hat', () => {
    const p = project('Mein Pack', 'meinpack', { waffen: ['ruby_sword'], moebel: ['chair'] });
    const subset = selectFromProject(p, { excludedItemIds: [itemId(p, 'ruby_sword')], excludedGlyphIds: [] });
    const plan = planExport(subset);
    expect([...plan.itemFiles.keys()]).toEqual(['items/moebel/stuehle/stuehle.yml']);
  });

  it('gibt ohne Auswahl das unveränderte Projekt zurück', () => {
    const p = project('A', 'a', { waffen: ['x'], moebel: [] });
    expect(selectFromProject(p, undefined)).toBe(p);
    expect(selectFromProject(p, { excludedItemIds: [], excludedGlyphIds: [] })).toBe(p);
  });
});

describe('Export mehrerer Projekte', () => {
  it('packt mehrere Projekte in ein ZIP mit eigenem Ordner und Pack pro Projekt', async () => {
    const a = project('Waffen Pack', 'waffenpack', { waffen: ['ruby_sword'], moebel: [] });
    const b = project('Deko', 'deko', { waffen: ['deko_axe'], moebel: ['chair'] });
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
    expect(paths).toContain('ANLEITUNG.txt');

    const result = await buildMultiExportZip(multi, 'full');
    expect(result.fileName).toBe('nexobuilder_2_projekte_nexo.zip');
    const zip = await JSZip.loadAsync(result.data);
    const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir).sort();
    expect(files).toEqual(paths);
    const guide = await zip.file('ANLEITUNG.txt')!.async('string');
    expect(guide).toContain('Projekt "Waffen Pack"');
    expect(guide).toContain('  - deko_axe');

    const packs = listMultiExportPaths(multi, 'pack');
    expect(packs).toContain('waffen_pack/pack.mcmeta');
    expect(packs).toContain('deko/pack.mcmeta');
  });

  it('meldet doppelte Item-IDs, Glyphen, Pack-Namen und gleiche Dateien zwischen Projekten', () => {
    const a = project('Pack', 'shared', { waffen: ['ruby_sword'], moebel: [] });
    const b = project('Pack', 'shared', { waffen: ['ruby_sword'], moebel: [] });
    const multi = planMultiExport([{ project: a }, { project: b }]);
    const errors = multi.issues.filter((i) => i.level === 'error' && !i.projectId).map((i) => i.message);
    expect(errors.some((m) => m.includes('Item-ID „ruby_sword“'))).toBe(true);
    expect(errors.some((m) => m.includes('Glyph „herz“'))).toBe(true);
    expect(errors.some((m) => m.includes('Pack-Namen „pack“'))).toBe(true);
    expect(errors.some((m) => m.includes('items/pack/waffen/waffen.yml'))).toBe(true);
    const warnings = multi.issues.filter((i) => i.level === 'warning' && !i.projectId).map((i) => i.message);
    expect(warnings.some((m) => m.includes('assets/shared/models/item/waffen/ruby_sword.json'))).toBe(true);
  });

  it('kennzeichnet Meldungen mit dem Projekt', () => {
    const a = project('Alpha', 'alpha', { waffen: ['a1'], moebel: [] });
    const b = project('Beta', 'beta', { waffen: [], moebel: ['b1'] });
    b.glyphs = [];
    const multi = planMultiExport([{ project: a }, { project: b }]);
    const info = multi.issues.find((i) => i.projectId === b.id && i.itemId);
    expect(info?.message.startsWith('[Beta] ')).toBe(true);
  });

  it('verhält sich mit einem Projekt genau wie der normale Export', () => {
    const a = project('Alpha', 'alpha', { waffen: ['a1'], moebel: ['a2'] });
    const multi = planMultiExport([{ project: a }]);
    expect(listMultiExportPaths(multi, 'full')).toEqual(listExportPaths(a, planExport(a), 'full'));
    expect(multi.issues.every((i) => !i.projectId)).toBe(true);
  });
});
