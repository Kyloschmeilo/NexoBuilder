import { describe, expect, it } from 'vitest';
import { convertJavaModel } from './javaModel';
import { createTextureModel, suggestSlotAssignment, getTextureTemplate } from './textureModel';
import { makePngDataUrl } from '../../test-utils/png';

const PNG = makePngDataUrl(16, 16);

describe('convertJavaModel', () => {
  it('matches texture references to the PNGs by file name', () => {
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

  it('keeps vanilla textures and reports missing custom textures', () => {
    const model = { parent: 'block/cube_all', textures: { all: 'minecraft:block/stone', other: 'mypack:block/missing' } };
    const result = convertJavaModel([
      { name: 'a.json', text: JSON.stringify(model) },
      { name: 'x.png', dataUrl: PNG },
      { name: 'y.png', dataUrl: PNG },
    ]);
    expect(result.json.textures).toEqual({ all: 'minecraft:block/stone', other: 'mypack:block/missing' });
    expect(
      result.issues.some((i) => i.level === 'error' && i.code === 'model.texturePngMissing' && i.args?.ref === 'mypack:block/missing'),
    ).toBe(true);
    expect(
      result.issues.some((i) => i.level === 'info' && i.code === 'model.vanillaTexture' && i.args?.ref === 'minecraft:block/stone'),
    ).toBe(true);
  });

  it('automatically assigns a single PNG to the only open reference', () => {
    const model = { parent: 'item/generated', textures: { layer0: 'item/some_name' } };
    const result = convertJavaModel([
      { name: 'a.json', text: JSON.stringify(model) },
      { name: 'other_name.png', dataUrl: PNG },
    ]);
    expect(result.json.textures).toEqual({ layer0: '$tex:t0' });
    expect(result.issues.some((i) => i.code === 'model.textureAutoAssigned')).toBe(true);
  });

  it('merges parent models dropped along and removes overrides', () => {
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

  it('detects elements outside the allowed range and free rotations', () => {
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
    expect(result.issues.some((i) => i.level === 'error' && i.code === 'model.elementsOutOfBounds')).toBe(true);
    expect(result.requiresVersion).toBe('1.21.11');
  });

  it('accepts JSON with comments and rejects non-models', () => {
    const withComments = '{\n // comment\n "parent": "item/generated", /* x */ "textures": {"layer0": "item/a"}}';
    expect(() => convertJavaModel([{ name: 'a.json', text: withComments }])).not.toThrow();
    expect(() => convertJavaModel([{ name: 'a.json', text: '{"foo": 1}' }])).toThrow('model.notMinecraftModelEmpty');
    expect(() => convertJavaModel([{ name: 'a.json', text: '[' }])).toThrow('model.invalidJson');
    expect(() => convertJavaModel([{ name: 'a.json', text: '[1]' }])).toThrow('model.notMinecraftModel');
  });

  it('drops invalid elements and reports them', () => {
    const model = {
      parent: 'block/block',
      textures: { all: 5, side: '#all' },
      elements: [
        null,
        { from: [0, 0], to: [1, 1, 1] },
        { from: [0, 0, 0], to: [16, 16, 16], faces: { up: null, down: { texture: '#side' } } },
      ],
    };
    const result = convertJavaModel([{ name: 'a.json', text: JSON.stringify(model) }]);
    expect(result.json.elements).toEqual([{ from: [0, 0, 0], to: [16, 16, 16], faces: { down: { texture: '#side' } } }]);
    expect(result.json.textures).toEqual({ side: '#all' });
    expect(result.issues).toContainEqual({ level: 'error', code: 'model.invalidElements', args: { count: 2 } });
  });

  it('takes over matching .png.mcmeta files', () => {
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
  it('creates a 2D item with several layers', () => {
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

  it('assigns block textures based on the file names', () => {
    const files = [
      { name: 'log_side.png', dataUrl: PNG },
      { name: 'log_top.png', dataUrl: PNG },
    ];
    const assignment = suggestSlotAssignment(getTextureTemplate('cube_column'), files);
    expect(assignment).toEqual({ end: 'log_top.png', side: 'log_side.png' });
    const result = createTextureModel('cube_column', assignment, files);
    expect(result.json.textures).toEqual({ end: '$tex:t0', side: '$tex:t1' });
  });

  it('reports missing assignments and sets particle for block/cube', () => {
    const files = [{ name: 'a.png', dataUrl: PNG }];
    const result = createTextureModel('cube', { north: 'a.png' }, files);
    expect(result.issues.filter((i) => i.level === 'error')).toHaveLength(5);
    expect(result.json.textures?.particle).toBe('$tex:t0');
  });
});
