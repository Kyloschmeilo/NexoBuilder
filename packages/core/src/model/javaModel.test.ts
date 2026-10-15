import { describe, expect, it } from 'vitest';
import { convertJavaModel } from './javaModel';
import { createTextureModel, suggestSlotAssignment, getTextureTemplate } from './textureModel';
import { makePngDataUrl } from '../test/png';

const PNG = makePngDataUrl(16, 16);

describe('convertJavaModel', () => {
  it('ordnet Texturverweise über den Dateinamen den PNGs zu', () => {
    const model = {
      textures: { '0': 'custom:item/ruby_blade', '1': 'custom:item/handle', particle: '#0' },
      elements: [{ from: [0, 0, 0], to: [1, 1, 1], faces: { north: { uv: [0, 0, 1, 1], texture: '#0' } } }],
    };
    const result = convertJavaModel([
      { name: 'sword.json', text: JSON.stringify(model) },
      { name: 'ruby_blade.png', dataUrl: PNG },
      { name: 'HANDLE.png', dataUrl: PNG },
    ]);
    expect(result.json.textures).toEqual({ '0': '$tex:t0', '1': '$tex:t1', particle: '#0' });
    expect(result.textures.map((t) => t.name)).toEqual(['ruby_blade', 'HANDLE']);
    expect(result.issues.filter((i) => i.level === 'error')).toHaveLength(0);
  });

  it('behält Vanilla-Texturen und meldet fehlende eigene Texturen', () => {
    const model = { parent: 'block/cube_all', textures: { all: 'minecraft:block/stone', other: 'mypack:block/missing' } };
    const result = convertJavaModel([
      { name: 'a.json', text: JSON.stringify(model) },
      { name: 'x.png', dataUrl: PNG },
      { name: 'y.png', dataUrl: PNG },
    ]);
    expect(result.json.textures).toEqual({ all: 'minecraft:block/stone', other: 'mypack:block/missing' });
    expect(result.issues.some((i) => i.level === 'error' && i.message.includes('mypack:block/missing'))).toBe(true);
    expect(result.issues.some((i) => i.level === 'info' && i.message.includes('minecraft:block/stone'))).toBe(true);
  });

  it('ordnet eine einzelne PNG automatisch der einzigen offenen Referenz zu', () => {
    const model = { parent: 'item/generated', textures: { layer0: 'item/some_name' } };
    const result = convertJavaModel([
      { name: 'a.json', text: JSON.stringify(model) },
      { name: 'other_name.png', dataUrl: PNG },
    ]);
    expect(result.json.textures).toEqual({ layer0: '$tex:t0' });
    expect(result.issues.some((i) => i.message.includes('automatisch'))).toBe(true);
  });

  it('führt mit abgelegte Parent-Modelle zusammen und entfernt overrides', () => {
    const parent = {
      parent: 'block/block',
      textures: { particle: '#side' },
      elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces: { up: { texture: '#side' } } }],
      display: { gui: { rotation: [30, 45, 0] } },
    };
    const child = {
      parent: 'mypack:block/base',
      textures: { side: 'mypack:block/side' },
      display: { head: { scale: [2, 2, 2] } },
      overrides: [{ predicate: { custom_model_data: 1 }, model: 'x' }],
    };
    const result = convertJavaModel([
      { name: 'base.json', text: JSON.stringify(parent) },
      { name: 'child.json', text: JSON.stringify(child) },
      { name: 'side.png', dataUrl: PNG },
    ]);
    expect(result.fileName).toBe('child.json');
    expect(result.json.parent).toBe('block/block');
    expect(result.json.elements).toHaveLength(1);
    expect(result.json.display).toEqual({ head: { scale: [2, 2, 2] }, gui: { rotation: [30, 45, 0] } });
    expect(result.json.textures).toEqual({ side: '$tex:t0', particle: '#side' });
    expect(result.json.overrides).toBeUndefined();
  });

  it('erkennt Elemente außerhalb des erlaubten Bereichs und freie Rotationen', () => {
    const model = {
      textures: { '0': 'a' },
      elements: [
        { from: [-17, 0, 0], to: [0, 1, 1], faces: {} },
        { from: [0, 0, 0], to: [1, 1, 1], rotation: { x: 10, y: 10, z: 0, origin: [0, 0, 0] }, faces: {} },
      ],
    };
    const result = convertJavaModel([
      { name: 'a.json', text: JSON.stringify(model) },
      { name: 'a.png', dataUrl: PNG },
    ]);
    expect(result.issues.some((i) => i.level === 'error' && i.message.includes('-16 bis 32'))).toBe(true);
    expect(result.requiresVersion).toBe('1.21.11');
  });

  it('akzeptiert JSON mit Kommentaren und lehnt Nicht-Modelle ab', () => {
    const withComments = '{\n // Kommentar\n "parent": "item/generated", /* x */ "textures": {"layer0": "item/a"}}';
    expect(() => convertJavaModel([{ name: 'a.json', text: withComments }])).not.toThrow();
    expect(() => convertJavaModel([{ name: 'a.json', text: '{"foo": 1}' }])).toThrow(/kein Minecraft-Modell/);
    expect(() => convertJavaModel([{ name: 'a.json', text: '[' }])).toThrow(/kein gültiges JSON/);
  });

  it('übernimmt passende .png.mcmeta-Dateien', () => {
    const model = { parent: 'item/generated', textures: { layer0: 'mypack:item/fire' } };
    const mcmeta = { animation: { frametime: 2 } };
    const result = convertJavaModel([
      { name: 'fire.json', text: JSON.stringify(model) },
      { name: 'fire.png', dataUrl: makePngDataUrl(16, 64) },
      { name: 'fire.png.mcmeta', text: JSON.stringify(mcmeta) },
    ]);
    expect(result.textures[0].mcmeta).toEqual(mcmeta);
  });
});

describe('createTextureModel', () => {
  it('erstellt ein 2D-Item mit mehreren Ebenen', () => {
    const files = [
      { name: 'base.png', dataUrl: PNG },
      { name: 'overlay.png', dataUrl: PNG },
    ];
    const assignment = suggestSlotAssignment(getTextureTemplate('generated'), files);
    expect(assignment).toEqual({ layer0: 'base.png', layer1: 'overlay.png' });
    const result = createTextureModel('generated', assignment, files);
    expect(result.json).toEqual({ parent: 'minecraft:item/generated', textures: { layer0: '$tex:t0', layer1: '$tex:t1' } });
    expect(result.source).toBe('png');
  });

  it('ordnet Block-Texturen anhand der Dateinamen zu', () => {
    const files = [
      { name: 'log_side.png', dataUrl: PNG },
      { name: 'log_top.png', dataUrl: PNG },
    ];
    const assignment = suggestSlotAssignment(getTextureTemplate('cube_column'), files);
    expect(assignment).toEqual({ end: 'log_top.png', side: 'log_side.png' });
    const result = createTextureModel('cube_column', assignment, files);
    expect(result.json.textures).toEqual({ end: '$tex:t0', side: '$tex:t1' });
  });

  it('meldet fehlende Zuordnungen und setzt particle für block/cube', () => {
    const files = [{ name: 'a.png', dataUrl: PNG }];
    const result = createTextureModel('cube', { north: 'a.png' }, files);
    expect(result.issues.filter((i) => i.level === 'error')).toHaveLength(5);
    expect(result.json.textures?.particle).toBe('$tex:t0');
  });
});
