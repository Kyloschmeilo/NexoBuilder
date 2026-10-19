/** The less common glyph and sound options of both targets: explicit characters, shadows, emoji content, sound replacement and references. */
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  createGlyph,
  createProject,
  createSound,
  glyphFileFromDataUrl,
  type PackTargetId,
  type Project,
  validateGlyphs,
  validateSounds,
} from '@resourcepackbuilder/core/project';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { planExport } from './plan';
import { buildRootFiles } from './targets/nexo/rootFiles';
import { pluginText } from '../test-utils/export';

const OGG = 'data:audio/ogg;base64,' + btoa('OggS' + '\0'.repeat(20));
const GIF = 'data:image/gif;base64,' + Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 9, 0, 11, 0, 0, 0, 0, 0x3b]).toString('base64');
const CE_CONFIG = 'resources/klang/configuration';

const project = (target: PackTargetId): Project => createProject('Klang', 'klang', '1.21.11', target);
const codes = (issues: Array<{ code: string }>) => issues.map((i) => i.code);

function glyphs(target: PackTargetId): Project {
  const p = project(target);
  const heart = createGlyph('g1', 'heart', glyphFileFromDataUrl('heart.png', makePngDataUrl(8, 8)));
  heart.char = '';
  heart.shadow = '#80000000';
  heart.template = 'base_emoji';
  heart.placeholders = [':heart:'];
  heart.emojiContent = '<white><arg:emoji></white>';
  heart.emojiOverrides = { chat: "<hover:show_text:'<arg:keyword>'><arg:emoji></hover>", anvil: '' };
  const cat = createGlyph('g2', 'cat', glyphFileFromDataUrl('cat.gif', GIF), 'gif');
  cat.height = 11;
  cat.ascent = 9;
  cat.gifType = 'SPRITE';
  cat.interpolate = true;
  p.glyphs = [heart, cat];
  return p;
}

function sounds(target: PackTargetId): Project {
  const p = project(target);
  const ding = createSound('s1', 'block.glocke.ding', [{ name: 'ding.ogg', dataUrl: OGG, size: 24 }]);
  ding.preload = true;
  ding.weight = 3;
  ding.subtitle = 'subtitles.klang.ding';
  ding.reference = 'minecraft:block.bell.use';
  const silence = createSound('s2', 'block.glass.place', []);
  silence.replace = true;
  const echo = createSound('s3', 'block.glocke.echo', []);
  echo.reference = 'klang:block.glocke.ding';
  p.sounds = [ding, silence, echo];
  return p;
}

describe('Nexo glyph options', () => {
  it('writes the explicit character, the shadow, the template and the GIF animation type', () => {
    const plan = planExport(glyphs('nexo'));
    expect(plan.issues.filter((i) => i.level === 'error')).toEqual([]);
    const yaml = parse(pluginText(plan, 'glyphs/klang.yml'), { version: '1.1' });
    expect(yaml.heart).toMatchObject({ char: '', default_shadow: '#80000000', template: 'base_emoji' });
    // Emoji content is CraftEngine's
    expect(yaml.heart.content).toBeUndefined();
    expect(yaml.cat).toMatchObject({ type: 'SPRITE', interpolate: true });
  });

  it('leaves interpolate out of shader-animated GIFs', () => {
    const p = glyphs('nexo');
    p.glyphs[1].gifType = 'SHADER';
    const yaml = parse(pluginText(planExport(p), 'glyphs/klang.yml'), { version: '1.1' });
    expect(yaml.cat.type).toBe('SHADER');
    expect(yaml.cat.interpolate).toBeUndefined();
  });

  it('checks the character and the shadow color', () => {
    const p = glyphs('nexo');
    p.glyphs[0].char = 'ab';
    p.glyphs[0].shadow = 'red';
    expect(codes(validateGlyphs(p))).toEqual(expect.arrayContaining(['glyph.charInvalid', 'glyph.shadowInvalid']));
    p.glyphs[0].char = '😀';
    p.glyphs[0].shadow = '0xFF112233';
    expect(codes(validateGlyphs(p))).not.toContain('glyph.charInvalid');
    expect(codes(validateGlyphs(p))).not.toContain('glyph.shadowInvalid');
  });
});

describe('CraftEngine image and emoji options', () => {
  it('writes the explicit character and the emoji content with its overrides', () => {
    const plan = planExport(glyphs('craftengine'));
    expect(plan.issues.filter((i) => i.level === 'error')).toEqual([]);
    const yaml = parse(pluginText(plan, `${CE_CONFIG}/images.yml`));
    expect(yaml.images['klang:heart']).toMatchObject({ char: '' });
    expect(yaml.images['klang:heart'].default_shadow).toBeUndefined();
    expect(yaml.emoji['klang:heart']).toEqual({
      image: 'klang:heart',
      keywords: [':heart:'],
      content: '<white><arg:emoji></white>',
      content_overrides: { chat: "<hover:show_text:'<arg:keyword>'><arg:emoji></hover>" },
      chat_completion: false,
    });
  });
});

describe('Nexo sound options', () => {
  it('writes preload, weight, subtitle, replacing and referencing sound events', () => {
    const p = sounds('nexo');
    const plan = planExport(p);
    expect(plan.issues.filter((i) => i.level === 'error')).toEqual([]);
    // Nexo's entry is files or one reference: the files of a referencing sound are not used
    expect(codes(plan.issues)).toContain('sound.referenceIgnoresFiles');
    const yaml = parse(buildRootFiles([plan]).get('sounds.yml') as string);
    expect(yaml.sounds).toEqual([
      {
        id: 'klang:block.glocke.ding',
        type: 'EVENT',
        reference_id: 'minecraft:block.bell.use',
        preload: true,
        weight: 3,
        subtitle: 'subtitles.klang.ding',
      },
      { id: 'minecraft:block.glass.place', sounds: [], replace: true },
      { id: 'klang:block.glocke.echo', type: 'EVENT', reference_id: 'klang:block.glocke.ding' },
    ]);
  });

  it('needs a file only for sounds that neither replace nor reference another event', () => {
    const p = sounds('nexo');
    p.sounds[1].replace = false;
    p.sounds[0].weight = 0;
    p.sounds[2].reference = 'Not Valid';
    expect(codes(validateSounds(p))).toEqual(
      expect.arrayContaining(['sound.fileMissing', 'sound.weightInvalid', 'sound.referenceInvalid']),
    );
    expect(codes(validateSounds(sounds('craftengine')))).toEqual([]);
  });
});

describe('CraftEngine sound options', () => {
  it('writes replace, subtitle, preload, weight and an event entry for the referenced sound', () => {
    const plan = planExport(sounds('craftengine'));
    expect(plan.issues.filter((i) => i.level !== 'info')).toEqual([]);
    const yaml = parse(pluginText(plan, `${CE_CONFIG}/sounds.yml`));
    expect(yaml.sounds).toEqual({
      'klang:block.glocke.ding': {
        subtitle: 'subtitles.klang.ding',
        sounds: [
          { name: 'klang:block/glocke/ding', weight: 3, preload: true },
          { name: 'minecraft:block.bell.use', type: 'event', weight: 3, preload: true },
        ],
      },
      'minecraft:block.glass.place': { replace: true, sounds: [] },
      'klang:block.glocke.echo': { sounds: [{ name: 'klang:block.glocke.ding', type: 'event' }] },
    });
  });
});
