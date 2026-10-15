/**
 * Computes the faces of a Java model for the 3D preview
 * (without a three.js dependency so the logic stays testable).
 *
 * Vertex order and UV rotation match Blockbench (js/util/three_custom.js, cube.js).
 */
import type { FaceName, ImportedModel, JavaModelElement, JavaModelFace, ModelTexture } from '@resourcepackbuilder/core/types';
import { parseTexturePlaceholder } from '@resourcepackbuilder/core/model/common';
import { getFrameSize } from '@resourcepackbuilder/core/model/textures';

export type Vec3 = [number, number, number];

export interface PreviewFace {
  /** 4 corners: top-left, top-right, bottom-left, bottom-right (relative to the rotation origin) */
  positions: [Vec3, Vec3, Vec3, Vec3];
  /** UV coordinates in the range 0–1 (three.js, flipY) */
  uvs: [[number, number], [number, number], [number, number], [number, number]];
  texture: ModelTexture | null;
  /** Unresolved reference (vanilla texture or #missing) */
  unresolved: string | null;
  shade: number;
  doubleSided?: boolean;
}

export interface PreviewElement {
  origin: Vec3;
  rotation: { x: number; y: number; z: number };
  scale: Vec3;
  faces: PreviewFace[];
}

export interface PreviewModel {
  elements: PreviewElement[];
  kind: 'elements' | 'generated' | 'empty';
  note?: string;
}

const FACE_ORDER: FaceName[] = ['east', 'west', 'up', 'down', 'south', 'north'];
/** Brightness like Minecraft blocks (directional light) */
const FACE_SHADE: Record<FaceName, number> = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.6, west: 0.6 };

const GENERATED_PARENTS = ['item/generated', 'item/handheld', 'item/handheld_rod', 'item/handheld_mace', 'builtin/generated'];

/** Elements of the most important vanilla parent models so texture models get a preview too. */
function builtinParentElements(parent: string): JavaModelElement[] | null {
  const p = parent.replace(/^minecraft:/, '');
  const cube = (faces: Partial<Record<FaceName, string>>): JavaModelElement => ({
    from: [0, 0, 0],
    to: [16, 16, 16],
    faces: Object.fromEntries(Object.entries(faces).map(([k, v]) => [k, { texture: v }])) as JavaModelElement['faces'],
  });
  switch (p) {
    case 'block/cube':
      return [cube({ down: '#down', up: '#up', north: '#north', south: '#south', west: '#west', east: '#east' })];
    case 'block/cube_all':
      return [cube({ down: '#all', up: '#all', north: '#all', south: '#all', west: '#all', east: '#all' })];
    case 'block/cube_column':
      return [cube({ down: '#end', up: '#end', north: '#side', south: '#side', west: '#side', east: '#side' })];
    case 'block/cube_bottom_top':
      return [cube({ down: '#bottom', up: '#top', north: '#side', south: '#side', west: '#side', east: '#side' })];
    case 'block/orientable':
      return [cube({ down: '#top', up: '#top', north: '#front', south: '#side', west: '#side', east: '#side' })];
    case 'block/cross':
      return [
        {
          from: [0.8, 0, 8],
          to: [15.2, 16, 8],
          rotation: { origin: [8, 8, 8], axis: 'y', angle: 45, rescale: true },
          shade: false,
          faces: { north: { uv: [0, 0, 16, 16], texture: '#cross' }, south: { uv: [0, 0, 16, 16], texture: '#cross' } },
        },
        {
          from: [8, 0, 0.8],
          to: [8, 16, 15.2],
          rotation: { origin: [8, 8, 8], axis: 'y', angle: 45, rescale: true },
          shade: false,
          faces: { west: { uv: [0, 0, 16, 16], texture: '#cross' }, east: { uv: [0, 0, 16, 16], texture: '#cross' } },
        },
      ];
    default:
      return null;
  }
}

/** Default UVs when a face has no UVs of its own (like Minecraft). */
function defaultUv(face: FaceName, from: Vec3, to: Vec3): [number, number, number, number] {
  switch (face) {
    case 'down':
      return [from[0], 16 - to[2], to[0], 16 - from[2]];
    case 'up':
      return [from[0], from[2], to[0], to[2]];
    case 'north':
      return [16 - to[0], 16 - to[1], 16 - from[0], 16 - from[1]];
    case 'south':
      return [from[0], 16 - to[1], to[0], 16 - from[1]];
    case 'west':
      return [from[2], 16 - to[1], to[2], 16 - from[1]];
    case 'east':
      return [16 - to[2], 16 - to[1], 16 - from[2], 16 - from[1]];
  }
}

function facePositions(face: FaceName, f: Vec3, t: Vec3): [Vec3, Vec3, Vec3, Vec3] {
  switch (face) {
    case 'east':
      return [
        [t[0], t[1], t[2]],
        [t[0], t[1], f[2]],
        [t[0], f[1], t[2]],
        [t[0], f[1], f[2]],
      ];
    case 'west':
      return [
        [f[0], t[1], f[2]],
        [f[0], t[1], t[2]],
        [f[0], f[1], f[2]],
        [f[0], f[1], t[2]],
      ];
    case 'up':
      return [
        [f[0], t[1], f[2]],
        [t[0], t[1], f[2]],
        [f[0], t[1], t[2]],
        [t[0], t[1], t[2]],
      ];
    case 'down':
      return [
        [f[0], f[1], t[2]],
        [t[0], f[1], t[2]],
        [f[0], f[1], f[2]],
        [t[0], f[1], f[2]],
      ];
    case 'south':
      return [
        [f[0], t[1], t[2]],
        [t[0], t[1], t[2]],
        [f[0], f[1], t[2]],
        [t[0], f[1], t[2]],
      ];
    case 'north':
      return [
        [t[0], t[1], f[2]],
        [f[0], t[1], f[2]],
        [t[0], f[1], f[2]],
        [f[0], f[1], f[2]],
      ];
  }
}

function rescaleFactor(angle: number): number {
  let a = Math.abs(angle);
  if (a > 45) a = 90 - a;
  return 1 / Math.cos((a * Math.PI) / 180);
}

export interface TextureResolution {
  texture: ModelTexture | null;
  unresolved: string | null;
}

/** Resolves "#key" references down to the actual texture. */
export function resolveTextureRef(model: ImportedModel, ref: string): TextureResolution {
  const textures = model.json.textures ?? {};
  let value: string | undefined = ref;
  const seen = new Set<string>();
  while (value?.startsWith('#')) {
    const key = value.slice(1);
    if (seen.has(key)) return { texture: null, unresolved: value };
    seen.add(key);
    value = textures[key];
  }
  if (!value) return { texture: null, unresolved: ref };
  const id = parseTexturePlaceholder(value);
  if (id) {
    const texture = model.textures.find((t) => t.id === id) ?? null;
    return texture?.dataUrl ? { texture, unresolved: null } : { texture: null, unresolved: value };
  }
  return { texture: null, unresolved: value };
}

export function buildPreviewModel(model: ImportedModel): PreviewModel {
  const json = model.json;
  let elements = Array.isArray(json.elements) ? json.elements : null;
  const parent = typeof json.parent === 'string' ? json.parent.replace(/^minecraft:/, '') : '';

  if (!elements && GENERATED_PARENTS.includes(parent)) {
    return buildGeneratedModel(model);
  }
  if (!elements && parent) {
    elements = builtinParentElements(parent);
    if (!elements) {
      return {
        elements: [],
        kind: 'empty',
        note: `Keine Vorschau: Das Modell nutzt das Parent-Modell „${json.parent}“ aus Minecraft.`,
      };
    }
  }
  if (!elements || elements.length === 0) return { elements: [], kind: 'empty', note: 'Das Modell enthält keine Elemente.' };

  const result: PreviewElement[] = [];
  for (const el of elements) {
    if (!Array.isArray(el.from) || !Array.isArray(el.to)) continue;
    const rot = el.rotation;
    const origin: Vec3 = rot?.origin ? [rot.origin[0], rot.origin[1], rot.origin[2]] : [8, 8, 8];
    const rotation = { x: 0, y: 0, z: 0 };
    if (rot) {
      if (typeof rot.angle === 'number' && rot.axis) rotation[rot.axis] = rot.angle;
      else {
        rotation.x = rot.x ?? 0;
        rotation.y = rot.y ?? 0;
        rotation.z = rot.z ?? 0;
      }
    }
    let scale: Vec3 = [1, 1, 1];
    if (rot?.rescale) {
      const r = [rescaleFactor(rotation.x), rescaleFactor(rotation.y), rescaleFactor(rotation.z)];
      scale = [r[1] * r[2], r[0] * r[2], r[0] * r[1]];
    }
    const from = el.from.map((v, i) => v - origin[i]) as Vec3;
    const to = el.to.map((v, i) => {
      const value = v - origin[i];
      return value === from[i] ? value + 0.001 : value;
    }) as Vec3;

    const faces: PreviewFace[] = [];
    for (const faceName of FACE_ORDER) {
      const face = el.faces?.[faceName] as JavaModelFace | undefined;
      if (!face) continue;
      const { texture, unresolved } = resolveTextureRef(model, face.texture ?? '#missing');
      const uv = face.uv ?? defaultUv(faceName, el.from as Vec3, el.to as Vec3);
      faces.push({
        positions: facePositions(faceName, from, to),
        uvs: computeUvs(uv, face.rotation ?? 0, texture),
        texture,
        unresolved,
        shade: el.shade === false ? 1 : FACE_SHADE[faceName],
      });
    }
    result.push({ origin, rotation, scale, faces });
  }
  return { elements: result, kind: 'elements' };
}

function computeUvs(uv: number[], rotation: number, texture: ModelTexture | null): PreviewFace['uvs'] {
  // Animated textures: show only the first frame
  let frameFactor = 1;
  if (texture?.mcmeta?.animation && texture.height > 0) {
    const frame = getFrameSize(texture);
    if (frame.height > 0) frameFactor = frame.height / texture.height;
  }
  const u = (v: number) => v / 16;
  const v = (val: number) => 1 - (val / 16) * frameFactor;
  const arr: Array<[number, number]> = [
    [u(uv[0]), v(uv[1])],
    [u(uv[2]), v(uv[1])],
    [u(uv[0]), v(uv[3])],
    [u(uv[2]), v(uv[3])],
  ];
  let rot = ((rotation % 360) + 360) % 360;
  while (rot > 0) {
    const a = arr[0];
    arr[0] = arr[2];
    arr[2] = arr[3];
    arr[3] = arr[1];
    arr[1] = a;
    rot -= 90;
  }
  return arr as PreviewFace['uvs'];
}

/** 2D items (item/generated): layers as a flat plane in the middle of the block. */
function buildGeneratedModel(model: ImportedModel): PreviewModel {
  const elements: PreviewElement[] = [];
  for (let i = 0; i < 5; i++) {
    const ref = model.json.textures?.[`layer${i}`];
    if (!ref) break;
    const { texture, unresolved } = resolveTextureRef(model, ref);
    const z = 0.02 * i;
    const from: Vec3 = [-8, -8, z];
    const to: Vec3 = [8, 8, z];
    elements.push({
      origin: [8, 8, 8],
      rotation: { x: 0, y: 0, z: 0 },
      scale: [1, 1, 1],
      faces: [
        {
          positions: facePositions('south', from, to),
          uvs: computeUvs([0, 0, 16, 16], 0, texture),
          texture,
          unresolved,
          shade: 1,
          doubleSided: true,
        },
      ],
    });
  }
  if (elements.length === 0) return { elements, kind: 'empty', note: 'Keine Textur-Ebene (layer0) gefunden.' };
  return { elements, kind: 'generated' };
}
