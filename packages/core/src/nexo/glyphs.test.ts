import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createProject } from '../project/factory';
import { createGlyph, glyphFileFromDataUrl, readGifInfo, validateGlyphs } from './glyphs';
import { planExport } from '../export/plan';
import { buildExportZip } from '../export/zip';
import { makePngDataUrl } from '../test/png';

// Minimal GIF (1×1) with width/height in the header
const GIF_9x11 = 'data:image/gif;base64,' + Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 9, 0, 11, 0, 0, 0, 0, 0x3b]).toString('base64');

describe('glyphs', () => {
  it('reads PNG and GIF sizes', () => {
    expect(readGifInfo(GIF_9x11)).toEqual({ width: 9, height: 11 });
    expect(glyphFileFromDataUrl('a.png', makePngDataUrl(8, 8))).toMatchObject({ width: 8, height: 8 });
    expect(glyphFileFromDataUrl('a.txt', 'data:text/plain;base64,aGFsbG8=')).toBeNull();
  });

  it('exports glyphs to glyphs/<project>.yml and puts the textures into the pack', async () => {
    const project = createProject('Emoji Pack', 'emojis', '26.3');
    const heart = createGlyph('g1', 'heart', glyphFileFromDataUrl('heart.png', makePngDataUrl(8, 8)));
    heart.placeholders = ['<3', ''];
    heart.permission = 'nexo.glyph.heart';
    const menu = createGlyph('g2', 'shop_menu', glyphFileFromDataUrl('menu.png', makePngDataUrl(256, 128)));
    menu.font = 'emojis:gui';
    const sheet = createGlyph('g3', 'sheet', glyphFileFromDataUrl('sheet.png', makePngDataUrl(32, 16)));
    sheet.rows = 1;
    sheet.columns = 2;
    const ref = createGlyph('g4', 'second', null, 'reference');
    ref.reference = 'sheet';
    ref.index = 2;
    const gif = createGlyph('g5', 'cat', glyphFileFromDataUrl('cat.gif', GIF_9x11), 'gif');
    gif.height = 11;
    gif.ascent = 9;
    project.glyphs = [heart, menu, sheet, ref, gif];

    const plan = planExport(project);
    expect(plan.issues.filter((i) => i.level === 'error' || i.level === 'warning')).toEqual([]);
    const yaml = parse(plan.glyphFiles.get('glyphs/emoji_pack.yml')!, { version: '1.1' });
    expect(yaml).toEqual({
      heart: { texture: 'emojis:glyphs/heart', ascent: 7, height: 8, permission: 'nexo.glyph.heart', placeholders: ['<3'], is_emoji: true },
      shop_menu: { texture: 'emojis:glyphs/shop_menu', ascent: 13, height: 128, font: 'emojis:gui' },
      sheet: { texture: 'emojis:glyphs/sheet', ascent: 7, height: 8, columns: 2, is_emoji: true },
      second: { reference: 'sheet', index: 2 },
      cat: { gif: 'emojis:glyphs/cat.gif', ascent: 9, height: 11, is_emoji: true },
    });
    expect(plan.packFiles.has('assets/emojis/textures/glyphs/heart.png')).toBe(true);
    expect(plan.packFiles.has('assets/emojis/textures/glyphs/cat.gif')).toBe(true);
    const zip = await buildExportZip(project, plan, 'full');
    expect(zip.paths).toContain('glyphs/emoji_pack.yml');
    expect(zip.paths).toContain('pack/external_packs/emoji_pack/assets/emojis/textures/glyphs/heart.png');
  });

  it('checks ascent, size, grid split and duplicate IDs', () => {
    const project = createProject('X', 'x', '26.3');
    const a = createGlyph('a', 'dup', glyphFileFromDataUrl('a.png', makePngDataUrl(8, 8)));
    a.ascent = 9;
    const b = createGlyph('b', 'dup', glyphFileFromDataUrl('b.png', makePngDataUrl(512, 512)));
    const c = createGlyph('c', 'grid', glyphFileFromDataUrl('c.png', makePngDataUrl(30, 30)));
    c.columns = 4;
    const d = createGlyph('d', 'empty', null);
    project.glyphs = [a, b, c, d];
    const codes = validateGlyphs(project).filter((i) => i.level === 'error').map((i) => i.detail?.code);
    expect(codes).toContain('glyph.ascentTooLarge');
    expect(codes).toContain('glyph.idDuplicate');
    expect(codes).toContain('glyph.cellTooLarge');
    expect(codes).toContain('glyph.gridUneven');
    expect(codes).toContain('glyph.pngMissing');
  });
});
