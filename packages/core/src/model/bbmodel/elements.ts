/** Converts Blockbench cubes into Java model elements. */
import { isPlainObject } from '@resourcepackbuilder/utils';
import { FACE_NAMES, roundNumber } from '../geometry';
import type { FaceName, JavaElementRotation, JavaModelElement, JavaModelFace } from '../types';
import { faceTexture, type TextureEntry } from './textures';
import { positiveNumber, vec3, type BBElement, type UvSize } from './types';

/** Element types without their own geometry */
const NON_GEOMETRY_TYPES = new Set(['generated_item_mesh', 'locator', 'null_object', 'bounding_box', 'armature', 'armature_bone']);

export interface ElementOptions {
  textures: TextureEntry[];
  uv: UvSize;
  /** The format has its own UV size per texture (Blockbench: per_texture_uv_size) */
  perTextureUv: boolean;
  /** The format's origin is in the center (Blockbench: centered_grid) */
  centered: boolean;
  /** Blockbench 26.3+ writes shade_direction_override instead of shade:false */
  usesShadeOverride: boolean;
}

export interface ConvertedElements {
  elements: JavaModelElement[];
  /** Indices of the textures used by faces */
  usedTextures: Set<number>;
  skippedNonCubes: number;
  facesWithoutTexture: number;
  /** UV rotations that are no multiple of 90° (dropped) */
  invalidUvRotations: number;
}

export function convertElements(elements: BBElement[], outliner: unknown[] | undefined, options: ElementOptions): ConvertedElements {
  const result: ConvertedElements = {
    elements: [],
    usedTextures: new Set(),
    skippedNonCubes: 0,
    facesWithoutTexture: 0,
    invalidUvRotations: 0,
  };
  for (const el of orderElements(elements, outliner)) {
    const type = el.type ?? 'cube';
    // Silently skip non-exported elements and pure helper objects (locators, placeholders for 2D items …)
    if (el.export === false || NON_GEOMETRY_TYPES.has(type)) continue;
    if (type !== 'cube') {
      result.skippedNonCubes++;
      continue;
    }
    if (!Array.isArray(el.from) || !Array.isArray(el.to)) continue;
    const element = convertCube(el, options, result);
    if (Object.keys(element.faces).length > 0) result.elements.push(element);
  }
  return result;
}

function convertCube(el: BBElement, options: ElementOptions, stats: ConvertedElements): JavaModelElement {
  const inflate = typeof el.inflate === 'number' ? el.inflate : 0;
  const offset = options.centered ? [8, 0, 8] : [0, 0, 0];
  const [fx, fy, fz] = vec3(el.from);
  const [tx, ty, tz] = vec3(el.to);
  const [ox, oy, oz] = vec3(el.origin ?? [0, 0, 0]);
  const from: [number, number, number] = [
    roundNumber(fx - inflate + offset[0]),
    roundNumber(fy - inflate + offset[1]),
    roundNumber(fz - inflate + offset[2]),
  ];
  const to: [number, number, number] = [
    roundNumber(tx + inflate + offset[0]),
    roundNumber(ty + inflate + offset[1]),
    roundNumber(tz + inflate + offset[2]),
  ];
  const origin: [number, number, number] = [roundNumber(ox + offset[0]), roundNumber(oy + offset[1]), roundNumber(oz + offset[2])];

  return {
    // Key order as in the Blockbench export
    ...(el.name && el.name !== 'cube' && { name: el.name }),
    from,
    to,
    ...convertRotation(el, origin),
    ...convertShading(el, options.usesShadeOverride),
    ...(typeof el.light_emission === 'number' && el.light_emission > 0 && { light_emission: Math.min(15, Math.round(el.light_emission)) }),
    faces: convertFaces(el, options, stats),
  };
}

function convertRotation(el: BBElement, origin: [number, number, number]): Pick<JavaModelElement, 'rotation'> {
  const rot = vec3(el.rotation ?? [0, 0, 0]);
  const nonZero = rot.filter((v) => v !== 0);
  let rotation: JavaElementRotation | undefined;
  if (nonZero.length === 1 && Math.abs(nonZero[0]) <= 45) {
    const axisIndex = rot.findIndex((v) => v !== 0);
    rotation = { angle: roundNumber(rot[axisIndex]), axis: (['x', 'y', 'z'] as const)[axisIndex], origin };
  } else if (nonZero.length > 0) {
    rotation = { x: roundNumber(rot[0]), y: roundNumber(rot[1]), z: roundNumber(rot[2]), origin };
  }
  if (el.rescale) {
    const axis = el.rotation_axis === 'x' || el.rotation_axis === 'z' ? el.rotation_axis : 'y';
    rotation = rotation ? { ...rotation, rescale: true } : { angle: 0, axis, origin, rescale: true };
  }
  return rotation ? { rotation } : {};
}

/** Like Blockbench: shade:false or, from 26.3 on, shade_direction_override */
function convertShading(el: BBElement, usesShadeOverride: boolean): Pick<JavaModelElement, 'shade' | 'shade_direction_override'> {
  if (usesShadeOverride) return el.shade_direction_override ? { shade_direction_override: el.shade_direction_override } : {};
  return el.shade === false ? { shade: false } : {};
}

function convertFaces(el: BBElement, options: ElementOptions, stats: ConvertedElements): JavaModelElement['faces'] {
  const faces: JavaModelElement['faces'] = {};
  const source = el.faces ?? {};
  const boxUvs = el.box_uv ? computeBoxUv(el) : null;
  for (const faceName of FACE_NAMES) {
    const face = source[faceName];
    if (!face) continue;
    const texture = faceTexture(options.textures, face.texture);
    if (texture === null) continue; // face disabled → not exported

    const out: JavaModelFace = { texture: '#missing' };
    if (face.enabled !== false) {
      const rawUv = Array.isArray(face.uv) && face.uv.length === 4 ? face.uv : boxUvs?.[faceName];
      if (rawUv) {
        const uv =
          options.perTextureUv && texture
            ? {
                width: positiveNumber(texture.tex.uv_width, options.uv.width),
                height: positiveNumber(texture.tex.uv_height, options.uv.height),
              }
            : options.uv;
        const [u1, v1, u2, v2] = rawUv.map((n, i) => roundNumber((n * 16) / (i % 2 ? uv.height : uv.width)));
        out.uv = [u1, v1, u2, v2];
      }
    }
    if (face.rotation) {
      const r = ((Math.round(face.rotation) % 360) + 360) % 360;
      if (r % 90 !== 0) stats.invalidUvRotations++;
      else if (r !== 0) out.rotation = r;
    }
    if (texture) {
      stats.usedTextures.add(texture.index);
      out.texture = `#${texture.key}`;
    } else {
      stats.facesWithoutTexture++;
    }
    if (face.cullface) out.cullface = face.cullface;
    if (typeof face.tint === 'number' && face.tint >= 0) out.tintindex = face.tint;
    faces[faceName] = out;
  }
  return faces;
}

/** Order of the elements as in the outliner (Blockbench exports it this way too). */
function orderElements(elements: BBElement[], outliner: unknown[] | undefined): BBElement[] {
  if (!Array.isArray(outliner)) return elements;
  const byUuid = new Map<string, BBElement>();
  for (const el of elements) if (el.uuid) byUuid.set(el.uuid, el);
  const result: BBElement[] = [];
  const seen = new Set<BBElement>();
  const visit = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (typeof node === 'string') {
        const el = byUuid.get(node);
        if (el && !seen.has(el)) {
          seen.add(el);
          result.push(el);
        }
      } else if (isPlainObject(node) && Array.isArray(node.children)) {
        visit(node.children);
      }
    }
  };
  visit(outliner);
  for (const el of elements) {
    if (!seen.has(el)) result.push(el);
  }
  return result;
}

export function hasRotatedGroups(outliner: unknown[] | undefined): boolean {
  if (!Array.isArray(outliner)) return false;
  return outliner.some((node) => {
    if (!isPlainObject(node)) return false;
    const rotation = node.rotation;
    if (Array.isArray(rotation) && rotation.some((v) => typeof v === 'number' && v !== 0)) return true;
    return Array.isArray(node.children) && hasRotatedGroups(node.children);
  });
}

/** Box UV calculation as in Blockbench (cube.js → updateUV), in case faces have no stored UVs. */
function computeBoxUv(el: BBElement): Partial<Record<FaceName, number[]>> {
  const from = vec3(el.from);
  const to = vec3(el.to);
  const size = [0, 1, 2].map((i) => Math.floor(Math.abs(to[i] - from[i]) + 0.0000001));
  const off = vec3(el.uv_offset ?? [0, 0]);
  const list: Array<{ face: FaceName; from: number[]; size: number[] }> = [
    { face: 'east', from: [0, size[2]], size: [size[2], size[1]] },
    { face: 'west', from: [size[2] + size[0], size[2]], size: [size[2], size[1]] },
    { face: 'up', from: [size[2] + size[0], size[2]], size: [-size[0], -size[2]] },
    { face: 'down', from: [size[2] + size[0] * 2, 0], size: [-size[0], size[2]] },
    { face: 'south', from: [size[2] * 2 + size[0], size[2]], size: [size[0], size[1]] },
    { face: 'north', from: [size[2], size[2]], size: [size[0], size[1]] },
  ];
  if (el.mirror_uv) {
    for (const f of list) {
      f.from[0] += f.size[0];
      f.size[0] *= -1;
    }
    const east = list[0];
    const west = list[1];
    [east.from, west.from] = [west.from.slice(), east.from.slice()];
    [east.size, west.size] = [west.size.slice(), east.size.slice()];
  }
  const result: Partial<Record<FaceName, number[]>> = {};
  for (const f of list) {
    result[f.face] = [f.from[0] + off[0], f.from[1] + off[1], f.from[0] + f.size[0] + off[0], f.from[1] + f.size[1] + off[1]];
  }
  return result;
}
