import { describe, expect, it } from 'vitest';
import { convertBBModel } from './bbmodel';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';

const PNG_32 = makePngDataUrl(32, 32);

function texture(overrides: Record<string, unknown> = {}) {
  return {
    path: '',
    name: 'ruby.png',
    folder: 'item',
    namespace: '',
    id: '0',
    width: 32,
    height: 32,
    uv_width: 32,
    uv_height: 32,
    particle: false,
    render_mode: 'default',
    pbr_channel: 'color',
    frame_time: 1,
    frame_order_type: 'loop',
    frame_order: '',
    frame_interpolate: false,
    visible: true,
    internal: true,
    saved: false,
    uuid: 'tex-uuid-0',
    source: PNG_32,
    ...overrides,
  };
}

function cube(overrides: Record<string, unknown> = {}) {
  return {
    name: 'cube',
    box_uv: false,
    rescale: false,
    locked: false,
    light_emission: 0,
    render_order: 'default',
    from: [0, 0, 0],
    to: [16, 16, 16],
    autouv: 0,
    color: 0,
    origin: [8, 8, 8],
    faces: {
      north: { uv: [0, 0, 32, 32], texture: 0 },
      east: { uv: [0, 0, 32, 32], texture: 0 },
      south: { uv: [0, 0, 32, 32], texture: 0 },
      west: { uv: [0, 0, 32, 32], texture: 0 },
      up: { uv: [32, 32, 0, 0], texture: 0 },
      down: { uv: [32, 0, 0, 32], texture: 0 },
    },
    type: 'cube',
    uuid: 'cube-' + Math.random().toString(36).slice(2),
    ...overrides,
  };
}

function bbmodel(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    meta: { format_version: '5.0', model_format: 'java_block', box_uv: false },
    name: 'test',
    parent: '',
    ambientocclusion: true,
    front_gui_light: false,
    java_block_version: '1.21.11',
    unhandled_root_fields: {},
    resolution: { width: 32, height: 32 },
    elements: [cube({ uuid: 'c1' })],
    groups: [],
    outliner: ['c1'],
    textures: [texture()],
    ...overrides,
  });
}

describe('convertBBModel', () => {
  it('converts UVs from the pixel grid to the 0–16 range', () => {
    const result = convertBBModel(bbmodel(), 'test.bbmodel');
    const el = result.json.elements![0];
    expect(el.faces.north).toEqual({ uv: [0, 0, 16, 16], texture: '#0' });
    expect(el.faces.up).toEqual({ uv: [16, 16, 0, 0], texture: '#0' });
    expect(result.json.texture_size).toEqual([32, 32]);
    expect(result.json.textures).toEqual({ '0': '$tex:t0', particle: '$tex:t0' });
    expect(result.textures).toHaveLength(1);
    expect(result.textures[0]).toMatchObject({ id: 't0', name: 'ruby', width: 32, height: 32, mcmeta: null });
    expect(result.issues.filter((i) => i.level === 'error')).toHaveLength(0);
  });

  it('omits disabled faces (texture: null) and marks faces without a texture', () => {
    const el = cube({
      uuid: 'c1',
      faces: {
        north: { uv: [0, 0, 32, 32], texture: 0 },
        south: { uv: [0, 0, 32, 32] },
        down: { uv: [0, 0, 32, 32], texture: null },
      },
    });
    const result = convertBBModel(bbmodel({ elements: [el] }), 'x.bbmodel');
    const faces = result.json.elements![0].faces;
    expect(Object.keys(faces).sort()).toEqual(['north', 'south']);
    expect(faces.south!.texture).toBe('#missing');
    expect(result.issues.some((i) => i.level === 'warning' && i.code === 'model.facesWithoutTexture')).toBe(true);
  });

  it('writes single-axis rotations classically and free angles with a version hint', () => {
    const a = convertBBModel(bbmodel({ elements: [cube({ uuid: 'c1', rotation: [0, 0, 45] })] }), 'a.bbmodel');
    expect(a.json.elements![0].rotation).toEqual({ angle: 45, axis: 'z', origin: [8, 8, 8] });
    expect(a.requiresVersion).toBeUndefined();

    const b = convertBBModel(bbmodel({ elements: [cube({ uuid: 'c1', rotation: [30, 0, 0] })] }), 'b.bbmodel');
    expect(b.json.elements![0].rotation).toEqual({ angle: 30, axis: 'x', origin: [8, 8, 8] });
    expect(b.requiresVersion).toBe('1.21.6');

    const c = convertBBModel(bbmodel({ elements: [cube({ uuid: 'c1', rotation: [10, 20, 0] })] }), 'c.bbmodel');
    expect(c.json.elements![0].rotation).toEqual({ x: 10, y: 20, z: 0, origin: [8, 8, 8] });
    expect(c.requiresVersion).toBe('1.21.11');

    const d = convertBBModel(bbmodel({ elements: [cube({ uuid: 'c1', rotation: [0, 90, 0] })] }), 'd.bbmodel');
    expect(d.json.elements![0].rotation).toEqual({ x: 0, y: 90, z: 0, origin: [8, 8, 8] });
    expect(d.requiresVersion).toBe('1.21.11');
  });

  it('takes over rescale, shade and light_emission', () => {
    const result = convertBBModel(
      bbmodel({ elements: [cube({ uuid: 'c1', rescale: true, shade: false, light_emission: 7 })] }),
      'x.bbmodel',
    );
    const el = result.json.elements![0];
    expect(el.rotation).toEqual({ angle: 0, axis: 'y', origin: [8, 8, 8], rescale: true });
    expect(el.shade).toBe(false);
    expect(el.light_emission).toBe(7);
  });

  it('uses shade_direction_override instead of shade from java_block_version 26.3 on', () => {
    const result = convertBBModel(
      bbmodel({ java_block_version: '26.3', elements: [cube({ uuid: 'c1', shade: false, shade_direction_override: 'up' })] }),
      'x.bbmodel',
    );
    const el = result.json.elements![0];
    expect(el.shade).toBeUndefined();
    expect(el.shade_direction_override).toBe('up');
    expect(result.requiresVersion).toBe('26.3');
  });

  it('takes inflate into account', () => {
    const result = convertBBModel(bbmodel({ elements: [cube({ uuid: 'c1', from: [4, 4, 4], to: [12, 12, 12], inflate: 0.5 })] }), 'x');
    expect(result.json.elements![0].from).toEqual([3.5, 3.5, 3.5]);
    expect(result.json.elements![0].to).toEqual([12.5, 12.5, 12.5]);
  });

  it('exports elements in outliner order and skips export:false', () => {
    const elements = [
      cube({ uuid: 'a', name: 'a', from: [0, 0, 0], to: [1, 1, 1] }),
      cube({ uuid: 'b', name: 'b', from: [2, 2, 2], to: [3, 3, 3] }),
      cube({ uuid: 'c', name: 'c', from: [4, 4, 4], to: [5, 5, 5], export: false }),
    ];
    const outliner = [{ uuid: 'g1', name: 'group', children: ['b', { uuid: 'g2', children: ['a', 'c'] }] }];
    const result = convertBBModel(bbmodel({ elements, outliner }), 'x');
    expect(result.json.elements!.map((e) => e.name)).toEqual(['b', 'a']);
  });

  it('reports cubes outside -16 to 32 as errors', () => {
    const result = convertBBModel(bbmodel({ elements: [cube({ uuid: 'c1', from: [-20, 0, 0], to: [0, 1, 1] })] }), 'x');
    expect(result.issues.some((i) => i.level === 'error' && i.code === 'model.elementsOutOfBounds')).toBe(true);
  });

  it('resolves non-embedded textures via additionally dropped PNGs', () => {
    const missing = convertBBModel(bbmodel({ textures: [texture({ source: undefined, internal: false })] }), 'x');
    expect(missing.textures[0].dataUrl).toBe('');
    expect(missing.issues.some((i) => i.level === 'error' && i.code === 'model.textureNotEmbedded')).toBe(true);

    const resolved = convertBBModel(bbmodel({ textures: [texture({ source: undefined, internal: false })] }), 'x', [
      { name: 'Ruby.PNG', dataUrl: PNG_32 },
    ]);
    expect(resolved.textures[0].dataUrl).toBe(PNG_32);
    expect(resolved.issues.filter((i) => i.level === 'error')).toHaveLength(0);
  });

  it('generates an mcmeta for animated textures', () => {
    const tex = texture({ source: makePngDataUrl(32, 128), height: 128, frame_time: 4, frame_order_type: 'back_and_forth' });
    const result = convertBBModel(bbmodel({ textures: [tex] }), 'x');
    expect(result.textures[0].mcmeta).toEqual({ animation: { frametime: 4, frames: [0, 1, 2, 3, 2, 1] } });
  });

  it('shifts models from centered formats (Generic Model) by 8 pixels', () => {
    const result = convertBBModel(
      bbmodel({
        meta: { format_version: '5.0', model_format: 'free', box_uv: false },
        elements: [cube({ uuid: 'c1', from: [-4, 0, -4], to: [4, 8, 4], origin: [0, 0, 0] })],
      }),
      'x',
    );
    const el = result.json.elements![0];
    expect(el.from).toEqual([4, 0, 4]);
    expect(el.to).toEqual([12, 8, 12]);
    expect(result.issues.some((i) => i.level === 'warning' && i.code === 'model.nonJavaFormat' && i.args?.format === 'Generic Model')).toBe(
      true,
    );
  });

  it('takes over display settings, parent and GUI light', () => {
    const result = convertBBModel(
      bbmodel({
        parent: 'item/handheld',
        front_gui_light: true,
        display: {
          gui: { rotation: [30, 45, 0], translation: [0, 0, 0], scale: [0.6, 0.6, 0.6] },
          head: { translation: [0, 14, 0] },
          unknown: { scale: [2, 2, 2] },
        },
      }),
      'x',
    );
    expect(result.json.parent).toBe('item/handheld');
    expect(result.json.gui_light).toBe('front');
    expect(result.json.display).toEqual({
      gui: { rotation: [30, 45, 0], translation: [0, 0, 0], scale: [0.6, 0.6, 0.6] },
      head: { translation: [0, 14, 0] },
    });
  });

  it('exports texture-only models (item/generated) with all textures', () => {
    const placeholder = { type: 'generated_item_mesh', uuid: 'gen', name: 'layer0', export: false };
    const result = convertBBModel(
      bbmodel({ parent: 'item/generated', elements: [placeholder], outliner: ['gen'], textures: [texture({ id: 'layer0' })] }),
      'x',
    );
    expect(result.issues.filter((i) => i.level !== 'info')).toEqual([]);
    expect(result.json.textures).toEqual({ layer0: '$tex:t0' });
    expect(result.json.elements).toBeUndefined();
    expect(result.issues.filter((i) => i.level === 'error')).toHaveLength(0);
  });

  it('throws an understandable error for invalid files', () => {
    expect(() => convertBBModel('{broken', 'x.bbmodel')).toThrow('model.invalidBbmodel');
    expect(() => convertBBModel('{"foo":1}', 'x.bbmodel')).toThrow('model.noBlockbenchModel');
    expect(() => convertBBModel('[]', 'x.bbmodel')).toThrow('model.noBlockbenchModel');
  });

  it('drops broken elements, faces and textures instead of crashing', () => {
    const broken = cube({ uuid: 'c2', faces: { north: null, up: 'x' } });
    const json = JSON.stringify({
      ...JSON.parse(bbmodel({ elements: [null, 7, cube({ uuid: 'c1' }), broken] })),
      meta: { model_format: { evil: true } },
      textures: [null, ...JSON.parse(bbmodel()).textures],
      resolution: 'big',
    });
    const result = convertBBModel(json, 'x.bbmodel');
    expect(result.json.elements).toHaveLength(1);
    // The broken texture keeps its slot, so the face references (by index) still match
    expect(result.textures).toHaveLength(1);
    expect(result.issues.some((i) => i.code === 'model.nonJavaFormat')).toBe(false);
  });
});
