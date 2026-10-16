/**
 * Computes the faces of a Java model for the 3D preview
 * (without a three.js dependency so the logic stays testable).
 *
 * Vertex order and UV rotation match Blockbench (js/util/three_custom.js, cube.js).
 */
import {
  type FaceName,
  getFrameSize,
  type ImportedModel,
  isGeneratedItemParent,
  MAX_ITEM_LAYERS,
  type ModelTexture,
  resolveTextureRef,
  stripMinecraftNamespace,
  vanillaParentElements,
} from '@resourcepackbuilder/minecraft';

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
  /** Why nothing can be shown (kind 'empty'); the UI translates it via the `preview.notes` messages. */
  note?: PreviewNote;
}

export type PreviewNote =
  { code: 'vanillaParent'; args: { parent: string } } | { code: 'noElements'; args?: undefined } | { code: 'noLayer0'; args?: undefined };

const FACE_ORDER: FaceName[] = ['east', 'west', 'up', 'down', 'south', 'north'];
/** Brightness like Minecraft blocks (directional light) */
const FACE_SHADE: Record<FaceName, number> = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.6, west: 0.6 };

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

export function buildPreviewModel(model: ImportedModel): PreviewModel {
  const json = model.json;
  let elements = Array.isArray(json.elements) ? json.elements : null;
  const parent = typeof json.parent === 'string' ? stripMinecraftNamespace(json.parent) : '';

  if (!elements && isGeneratedItemParent(parent)) {
    return buildGeneratedModel(model);
  }
  if (!elements && parent) {
    elements = vanillaParentElements(parent);
    if (!elements) {
      return {
        elements: [],
        kind: 'empty',
        note: { code: 'vanillaParent', args: { parent: String(json.parent) } },
      };
    }
  }
  if (!elements || elements.length === 0) return { elements: [], kind: 'empty', note: { code: 'noElements' } };

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
      const face = el.faces?.[faceName];
      if (!face) continue;
      const { texture, unresolved } = resolveTextureRef(model, face.texture ?? '#missing');
      const uv = face.uv ?? defaultUv(faceName, el.from, el.to);
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
  for (let i = 0; i < MAX_ITEM_LAYERS; i++) {
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
  if (elements.length === 0) return { elements, kind: 'empty', note: { code: 'noLayer0' } };
  return { elements, kind: 'generated' };
}
