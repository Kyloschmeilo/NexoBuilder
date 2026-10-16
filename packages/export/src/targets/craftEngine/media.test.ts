import { describe, expect, it } from 'vitest';
import { durationSeconds } from '@resourcepackbuilder/core/craftEngine';
import {
  createGlyph,
  createPainting,
  createProject,
  createSound,
  glyphFileFromDataUrl,
  type Project,
} from '@resourcepackbuilder/core/project';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from '../../plan';
import { pluginText } from '../../../test-utils/export';

const OGG = 'data:audio/ogg;base64,' + btoa('OggS' + '\0'.repeat(20));
const GIF = 'data:image/gif;base64,' + Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 9, 0, 11, 0, 0, 0, 0, 0x3b]).toString('base64');

const CONFIG = 'resources/klang/configuration';

function ceProject(): Project {
  return createProject('Klang', 'klang', '1.21.11', 'craftengine');
}

describe('CraftEngine images and emoji', () => {
  function glyphProject(): Project {
    const project = ceProject();
    const smile = createGlyph('g1', 'smile', glyphFileFromDataUrl('smile.png', makePngDataUrl(8, 8)));
    smile.placeholders = [':smile:', ' :) ', ''];
    smile.permission = 'emoji.smile';
    const sheet = createGlyph('g2', 'icons', glyphFileFromDataUrl('icons.png', makePngDataUrl(32, 16)));
    sheet.isEmoji = false;
    sheet.height = 10;
    sheet.ascent = 8;
    sheet.rows = 2;
    sheet.columns = 4;
    sheet.font = 'klang:icons';
    sheet.placeholders = [':icons:'];
    sheet.tabcomplete = true;
    const cell = createGlyph('g3', 'icon_six', null, 'reference');
    cell.reference = 'icons';
    cell.index = 6;
    project.glyphs = [smile, sheet, cell];
    return project;
  }

  it('writes images (with grid and cell references) and the emoji of their chat shortcuts', () => {
    const plan = planExport(glyphProject());
    expect(plan.issues.filter((i) => i.level !== 'info')).toEqual([]);
    expect(plan.packFiles.has('assets/klang/textures/glyphs/smile.png')).toBe(true);
    expect(plan.packFiles.has('assets/klang/textures/glyphs/icons.png')).toBe(true);
    expect(pluginText(plan, `${CONFIG}/images.yml`)).toBe(
      [
        '# Created with ResourcepackBuilder – glyphs of "Klang"',
        'images:',
        '  klang:smile:',
        '    file: klang:glyphs/smile.png',
        '    height: 8',
        '    ascent: 7',
        '  klang:icons:',
        '    file: klang:glyphs/icons.png',
        '    height: 10',
        '    ascent: 8',
        '    font: klang:icons',
        '    grid_size: 2,4',
        '  klang:icon_six:',
        '    ref: klang:icons:1:1',
        '',
        'emoji:',
        '  klang:smile:',
        '    image: klang:smile',
        '    keywords:',
        '      - ":smile:"',
        '      - :)',
        '    permission: emoji.smile',
        '    chat_completion: false',
        '  klang:icons:',
        '    image: klang:icons:0:0',
        '    keywords:',
        '      - ":icons:"',
        '',
      ].join('\n'),
    );
  });

  it('leaves out animated glyphs and references it cannot locate, with a warning', () => {
    const project = ceProject();
    const gif = createGlyph('g1', 'spin', glyphFileFromDataUrl('spin.gif', GIF), 'gif');
    const lost = createGlyph('g2', 'lost', null, 'reference');
    lost.reference = 'elsewhere';
    project.glyphs = [gif, lost];
    const plan = planExport(project);
    const glyphIssues = plan.issues.filter((i) => i.target?.kind === 'glyph');
    expect(glyphIssues.map((i) => [i.level, i.code, i.target?.id])).toEqual([
      ['warning', 'ce.glyphGifUnsupported', 'g1'],
      ['warning', 'ce.glyphReferenceUnknown', 'g2'],
    ]);
    expect(plan.packFiles.has('assets/klang/textures/glyphs/spin.gif')).toBe(false);
    expect(plan.pluginFiles.has(`${CONFIG}/images.yml`)).toBe(false);
  });

  it('notes a permission that CraftEngine drops because the glyph has no chat shortcut', () => {
    const project = ceProject();
    const vip = createGlyph('g1', 'vip', glyphFileFromDataUrl('vip.png', makePngDataUrl(8, 8)));
    vip.permission = 'glyph.vip';
    const shortcut = createGlyph('g2', 'star', glyphFileFromDataUrl('star.png', makePngDataUrl(8, 8)));
    shortcut.permission = 'glyph.star';
    shortcut.placeholders = [':star:'];
    project.glyphs = [vip, shortcut];
    const notes = planExport(project).issues.filter((i) => i.code === 'ce.glyphPermissionUnused');
    expect(notes.map((i) => [i.level, i.target?.id])).toEqual([['info', 'g1']]);
  });
});

describe('CraftEngine sounds and jukebox songs', () => {
  it('writes the sound events and the jukebox songs of music discs', () => {
    const project = ceProject();
    const ding = createSound('s1', 'block.glocke.ding', [{ name: 'ding.ogg', dataUrl: OGG, size: 24 }]);
    const song = createSound('s2', 'music.lied', [
      { name: 'a.ogg', dataUrl: OGG, size: 24 },
      { name: 'b.ogg', dataUrl: OGG, size: 24 },
    ]);
    song.stream = true;
    song.volume = 0.8;
    song.distance = 32;
    song.jukebox = { duration: '2m 30s', description: '<gold>Mein Lied', comparatorOutput: 7, range: 48 };
    project.sounds = [ding, song];
    const plan = planExport(project);
    expect(plan.issues.filter((i) => i.level !== 'info')).toEqual([]);
    expect(plan.packFiles.has('assets/klang/sounds/music/lied_2.ogg')).toBe(true);
    expect(pluginText(plan, `${CONFIG}/sounds.yml`)).toBe(
      [
        '# Created with ResourcepackBuilder – sounds of "Klang"',
        'sounds:',
        '  klang:block.glocke.ding:',
        '    sounds:',
        '      - klang:block/glocke/ding',
        '  klang:music.lied:',
        '    sounds:',
        '      - name: klang:music/lied_1',
        '        volume: 0.8',
        '        stream: true',
        '        attenuation_distance: 32',
        '      - name: klang:music/lied_2',
        '        volume: 0.8',
        '        stream: true',
        '        attenuation_distance: 32',
        '',
        'jukebox_songs:',
        '  klang:music.lied:',
        '    sound: klang:music.lied',
        '    length: 150',
        '    description: "<gold>Mein Lied"',
        '    comparator_output: 7',
        '    range: 48',
        '',
      ].join('\n'),
    );
  });

  it('reads song lengths in seconds', () => {
    expect(durationSeconds('2m 30s')).toBe(150);
    expect(durationSeconds('150')).toBe(150);
    expect(durationSeconds('1h 2.5s')).toBe(3602.5);
    expect(durationSeconds('100t')).toBe(5);
    expect(durationSeconds('')).toBeNull();
    expect(durationSeconds('soon')).toBeNull();
    expect(durationSeconds(' 2 m 30 s ')).toBe(150);
    expect(durationSeconds('2m30s')).toBe(150);
    expect(durationSeconds('2x')).toBeNull();
  });

  it('rejects long and adversarial durations quickly', () => {
    const start = performance.now();
    expect(durationSeconds('1'.repeat(64) + '!')).toBeNull();
    expect(durationSeconds('1 '.repeat(31) + 'x')).toBeNull();
    expect(durationSeconds('1'.repeat(100_000) + 'x')).toBeNull();
    expect(durationSeconds('1s '.repeat(30))).toBeNull();
    expect(performance.now() - start).toBeLessThan(100);
  });
});

describe('CraftEngine paintings', () => {
  it('writes the painting variants; only random paintings stay out of the op tab', () => {
    const project = ceProject();
    const sun = createPainting('p1', 'sonne', { name: 'sonne.png', dataUrl: makePngDataUrl(32, 16), width: 32, height: 16 });
    sun.title = '<yellow>Sonne';
    sun.author = 'Klara';
    sun.randomPlace = true;
    const small = createPainting('p2', 'klein', { name: 'klein.png', dataUrl: makePngDataUrl(16, 16), width: 16, height: 16 });
    project.paintings = [sun, small];
    const plan = planExport(project);
    expect(plan.issues.filter((i) => i.level !== 'info')).toEqual([]);
    expect(plan.packFiles.has('assets/klang/textures/painting/sonne.png')).toBe(true);
    expect(pluginText(plan, `${CONFIG}/paintings.yml`)).toBe(
      [
        '# Created with ResourcepackBuilder – paintings of "Klang"',
        'paintings:',
        '  klang:sonne:',
        '    width: 2',
        '    height: 1',
        '    title: "<yellow>Sonne"',
        '    author: Klara',
        '  klang:klein:',
        '    width: 1',
        '    height: 1',
        '    show_in_op_tab: true',
        '',
      ].join('\n'),
    );
  });
});
