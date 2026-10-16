import { describe, expect, it } from 'vitest';
import { createGlyph, createProject } from '@resourcepackbuilder/core/project';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { PackWriter } from './packWriter';
import { isSafeRelativePath } from './paths';
import { planExport } from './plan';
import { listMultiExportPaths } from './zip';

const PNG = makePngDataUrl(16, 16);

describe('PackWriter', () => {
  it('reports an unreadable data URL instead of throwing', () => {
    const writer = new PackWriter(true);
    expect(writer.binary('a.png', 'data:image/png;base64,%%%')).toBe(false);
    expect(writer.binary('b.png', 'not a data url')).toBe(false);
    expect(writer.binary('c.png', PNG)).toBe(true);
    expect([...writer.files.keys()]).toEqual(['c.png']);
    expect(writer.issues.map((i) => i.args?.path)).toEqual(['a.png', 'b.png']);
    expect(writer.issues.every((i) => i.code === 'plan.fileUnreadable' && i.level === 'error')).toBe(true);
  });

  it('refuses paths that could leave the pack', () => {
    const unsafe = ['../x.json', 'a/../b.json', 'a//b.json', './a.json', '/abs.json', 'C:/x.json', 'a\\b.json', ''];
    for (const path of unsafe) expect(isSafeRelativePath(path), path).toBe(false);
    expect(isSafeRelativePath('assets/ns/models/item/a-b.c.json')).toBe(true);

    const writer = new PackWriter(true);
    writer.text('../evil.json', '{}');
    expect(writer.binary('a/../../b.png', PNG)).toBe(false);
    writer.json('ok.json', {});
    expect([...writer.files.keys()]).toEqual(['ok.json']);
    expect(writer.issues.map((i) => [i.code, i.args?.path])).toEqual([
      ['plan.unsafePath', '../evil.json'],
      ['plan.unsafePath', 'a/../../b.png'],
    ]);
  });

  it('refuses to put an unsafe path into an archive', () => {
    const project = createProject('X', 'x');
    const plan = planExport(project);
    plan.pluginFiles.set('../outside.yml', 'a: 1');
    expect(() => listMultiExportPaths({ projects: [{ project, plan }], issues: [] }, 'full')).toThrow(/Unsafe path/);
  });

  it('checks data URLs without decoding them when binaries are left out', () => {
    const writer = new PackWriter(false);
    expect(writer.binary('a.png', PNG)).toBe(true);
    expect(writer.files.get('a.png')).toEqual(new Uint8Array(0));
    expect(writer.binary('b.png', 'broken')).toBe(false);
  });

  it('reports files written twice', () => {
    const writer = new PackWriter(true);
    writer.json('x.json', {});
    writer.text('x.json', '{}');
    expect(writer.duplicateIssues()).toEqual([{ level: 'error', code: 'plan.duplicateFile', args: { path: 'x.json' } }]);
  });

  it('lets one broken glyph not abort the whole export', () => {
    const project = createProject('Kaputt', 'kaputt');
    const broken = createGlyph('g_1', 'broken', { name: 'b.png', dataUrl: 'data:image/png;base64,%%%', width: 16, height: 16 }, 'image');
    const good = createGlyph('g_2', 'good', { name: 'g.png', dataUrl: PNG, width: 16, height: 16 }, 'image');
    project.glyphs = [broken, good];
    const plan = planExport(project);
    const unreadable = plan.issues.filter((i) => i.code === 'plan.fileUnreadable');
    expect(unreadable).toHaveLength(1);
    expect(unreadable[0].target).toEqual({ kind: 'glyph', id: 'g_1' });
    expect([...plan.packFiles.keys()].some((path) => path.endsWith('/good.png'))).toBe(true);
  });
});
