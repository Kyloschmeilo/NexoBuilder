/**
 * Converts Blockbench projects (.bbmodel) into Minecraft Java models.
 *
 * The logic follows the official Blockbench exporter for "Java Block/Item"
 * (js/formats/java/java_block.ts, Codec.compile):
 *  - only cubes are exported (meshes etc. do not exist in the Java format)
 *  - UVs are converted from pixel coordinates to the 0–16 range
 *  - faces with texture === null are skipped, faces without a texture get "#missing"
 *  - "inflate" enlarges from/to
 *  - rotations are written as {angle, axis, origin} or (from 1.21.11 on) as {x, y, z, origin}
 */
import type {
  FaceName,
  ImportedModel,
  Issue,
  JavaDisplayTransform,
  JavaElementRotation,
  JavaModelElement,
  JavaModelFace,
  JavaModelJson,
  ModelTexture,
} from '../types';
import { MODEL_FEATURE_VERSIONS } from '../minecraft/versions';
import { compareVersions, fileBaseName, isPlainObject, maxVersion, roundNumber } from '../util';
import { createTexture, findMcmetaFor, findPngByName, isPngDataUrl, type DroppedFile } from './textures';
import { ModelConversionError, texturePlaceholder } from './common';

interface BBFace {
  uv?: number[];
  texture?: number | string | null | false;
  rotation?: number;
  cullface?: string;
  tint?: number;
  enabled?: boolean;
}

interface BBElement {
  type?: string;
  uuid?: string;
  name?: string;
  from?: number[];
  to?: number[];
  origin?: number[];
  rotation?: number[];
  rotation_axis?: string;
  inflate?: number;
  rescale?: boolean;
  shade?: boolean;
  shade_direction_override?: string;
  light_emission?: number;
  export?: boolean;
  box_uv?: boolean;
  uv_offset?: number[];
  mirror_uv?: boolean;
  faces?: Record<string, BBFace>;
}

interface BBTexture {
  id?: string | number;
  uuid?: string;
  name?: string;
  path?: string;
  relative_path?: string;
  source?: string;
  width?: number;
  height?: number;
  uv_width?: number;
  uv_height?: number;
  particle?: boolean;
  frame_time?: number;
  frame_order_type?: string;
  frame_order?: string;
  frame_interpolate?: boolean;
  pbr_channel?: string;
}

interface BBModel {
  meta?: { format_version?: string; model_format?: string; box_uv?: boolean };
  name?: string;
  parent?: string;
  ambientocclusion?: boolean;
  front_gui_light?: boolean;
  java_block_version?: string;
  resolution?: { width?: number; height?: number };
  elements?: BBElement[];
  outliner?: unknown[];
  textures?: BBTexture[];
  display?: Record<string, unknown>;
  unhandled_root_fields?: Record<string, unknown>;
}

const FACE_NAMES: FaceName[] = ['north', 'east', 'south', 'west', 'up', 'down'];

/** Formats whose origin is in the center (Blockbench: centered_grid). */
const CENTERED_FORMATS = new Set([
  'free',
  'bedrock',
  'bedrock_block',
  'bedrock_old',
  'modded_entity',
  'optifine_entity',
  'optifine_part',
  'skin',
]);
/** Formats with their own UV size per texture (Blockbench: per_texture_uv_size). */
const PER_TEXTURE_UV_FORMATS = new Set(['free', 'optifine_entity', 'optifine_part', 'image']);

const FORMAT_LABELS: Record<string, string> = {
  java_block: 'Java Block/Item',
  free: 'Generic Model',
  bedrock: 'Bedrock Entity',
  bedrock_block: 'Bedrock Block',
  bedrock_old: 'Bedrock Entity (alt)',
  modded_entity: 'Modded Entity',
  optifine_entity: 'OptiFine Entity',
  optifine_part: 'OptiFine Part',
  skin: 'Minecraft Skin',
  image: 'Bild',
};

/** Java display contexts (display) that Blockbench exports. */
const DISPLAY_SLOTS = [
  'thirdperson_righthand',
  'thirdperson_lefthand',
  'firstperson_righthand',
  'firstperson_lefthand',
  'ground',
  'gui',
  'head',
  'embedded',
  'fixed',
  'on_shelf',
];

/** Element types without their own geometry */
const NON_GEOMETRY_TYPES = new Set(['generated_item_mesh', 'locator', 'null_object', 'bounding_box', 'armature', 'armature_bone']);

const COORD_MIN = -16;
const COORD_MAX = 32;

export function convertBBModel(text: string, fileName: string, extraFiles: DroppedFile[] = []): ImportedModel {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new ModelConversionError(`„${fileName}“ ist keine gültige .bbmodel-Datei (JSON-Fehler: ${(err as Error).message}).`);
  }
  if (!isPlainObject(raw) || (!Array.isArray(raw.elements) && !Array.isArray(raw.textures))) {
    throw new ModelConversionError(`„${fileName}“ enthält kein Blockbench-Modell.`);
  }
  const model = raw as BBModel;

  const issues: Issue[] = [];
  const format = model.meta?.model_format ?? 'java_block';
  const isJava = format === 'java_block';
  const centered = CENTERED_FORMATS.has(format);
  const perTextureUv = PER_TEXTURE_UV_FORMATS.has(format);
  if (!isJava) {
    issues.push({
      level: 'warning',
      message:
        `Das Modell ist im Blockbench-Format „${FORMAT_LABELS[format] ?? format}“ und nicht „Java Block/Item“. ` +
        'Würfel werden umgerechnet, Gruppen-Rotationen, Meshes und Animationen gehen dabei verloren. ' +
        'Für ein exaktes Ergebnis das Modell in Blockbench über „Datei → Projekt konvertieren“ nach „Java Block/Item“ umwandeln.',
    });
  }
  const javaVersion = typeof model.java_block_version === 'string' ? model.java_block_version : undefined;
  const usesShadeOverride = !!javaVersion && compareVersions(javaVersion, '26.3') >= 0;

  const resW = positiveNumber(model.resolution?.width, 16);
  const resH = positiveNumber(model.resolution?.height, 16);

  /* ------------------------------------------------------------ Textures */
  const bbTextures = Array.isArray(model.textures) ? model.textures : [];
  const textureEntries = bbTextures.map((tex, index) => {
    const displayName = tex.name || fileBaseName(tex.path ?? tex.relative_path ?? '') || `texture_${index}`;
    let dataUrl = isPngDataUrl(tex.source) ? tex.source : undefined;
    if (!dataUrl && tex.source?.startsWith('data:')) {
      issues.push({ level: 'error', message: `Die Textur „${displayName}“ ist kein PNG. Minecraft unterstützt nur PNG-Texturen.` });
    }
    if (!dataUrl) {
      const match = findPngByName(extraFiles, tex.name, tex.path && fileBaseName(tex.path), tex.relative_path && fileBaseName(tex.relative_path));
      dataUrl = match?.dataUrl;
    }
    return { tex, index, displayName, dataUrl };
  });

  const textureByIndex = (ref: BBFace['texture']): (typeof textureEntries)[number] | null | undefined => {
    if (ref === null) return null;
    if (typeof ref === 'number') return textureEntries[ref];
    if (typeof ref === 'string') {
      return textureEntries.find((e) => e.tex.uuid === ref || `#${e.tex.id}` === ref || String(e.tex.id) === ref);
    }
    return undefined;
  };

  /* ------------------------------------------------------------ Elements */
  const allElements = Array.isArray(model.elements) ? model.elements : [];
  const ordered = orderElements(allElements, model.outliner);
  const usedTextureIndices = new Set<number>();
  const elements: JavaModelElement[] = [];
  let missingFaceCount = 0;
  let skippedNonCubes = 0;
  let outOfBounds = 0;
  let requiresVersion: string | undefined;
  let invalidUvRotation = 0;

  for (const el of ordered) {
    const type = el.type ?? 'cube';
    // Silently skip non-exported elements and pure helper objects (locators, placeholders for 2D items …)
    if (el.export === false || NON_GEOMETRY_TYPES.has(type)) continue;
    if (type !== 'cube') {
      skippedNonCubes++;
      continue;
    }
    if (!Array.isArray(el.from) || !Array.isArray(el.to)) continue;

    const inflate = typeof el.inflate === 'number' ? el.inflate : 0;
    const offset = centered ? [8, 0, 8] : [0, 0, 0];
    const from = vec3(el.from).map((v, i) => roundNumber(v - inflate + offset[i])) as [number, number, number];
    const to = vec3(el.to).map((v, i) => roundNumber(v + inflate + offset[i])) as [number, number, number];
    const origin = vec3(el.origin ?? [0, 0, 0]).map((v, i) => roundNumber(v + offset[i])) as [number, number, number];

    // Key order as in the Blockbench export: name, from, to, shade, light_emission, rotation, faces
    const element = {} as JavaModelElement;
    if (el.name && el.name !== 'cube') element.name = el.name;
    element.from = from;
    element.to = to;

    // Rotation
    const rot = vec3(el.rotation ?? [0, 0, 0]);
    const nonZero = rot.filter((v) => v !== 0);
    if (nonZero.length === 1 && Math.abs(nonZero[0]) <= 45) {
      const axisIndex = rot.findIndex((v) => v !== 0);
      const angle = rot[axisIndex];
      element.rotation = { angle: roundNumber(angle), axis: (['x', 'y', 'z'] as const)[axisIndex], origin };
      if (Math.abs(angle) % 22.5 !== 0) {
        requiresVersion = maxVersion(requiresVersion, MODEL_FEATURE_VERSIONS.freeAngle);
      }
    } else if (nonZero.length > 0) {
      element.rotation = { x: roundNumber(rot[0]), y: roundNumber(rot[1]), z: roundNumber(rot[2]), origin };
      requiresVersion = maxVersion(requiresVersion, MODEL_FEATURE_VERSIONS.multiAxisRotation);
    }
    if (el.rescale) {
      if (element.rotation) {
        element.rotation.rescale = true;
      } else {
        const axis = el.rotation_axis === 'x' || el.rotation_axis === 'z' ? el.rotation_axis : 'y';
        element.rotation = { angle: 0, axis, origin, rescale: true } as JavaElementRotation;
      }
    }

    // Shading & light (like Blockbench: shade:false or, from 26.3 on, shade_direction_override)
    if (usesShadeOverride) {
      if (el.shade_direction_override) {
        element.shade_direction_override = el.shade_direction_override;
        requiresVersion = maxVersion(requiresVersion, MODEL_FEATURE_VERSIONS.shadeDirectionOverride);
      }
    } else if (el.shade === false) {
      element.shade = false;
    }
    if (typeof el.light_emission === 'number' && el.light_emission > 0) {
      element.light_emission = Math.min(15, Math.max(0, Math.round(el.light_emission)));
    }

    // Faces
    element.faces = {};
    const faces = el.faces ?? {};
    const boxUvs = el.box_uv ? computeBoxUv(el) : null;
    for (const faceName of FACE_NAMES) {
      const face = faces[faceName];
      if (!face) continue;
      const texEntry = textureByIndex(face.texture);
      if (texEntry === null) continue; // face disabled → not exported

      const out: JavaModelFace = { texture: '#missing' };
      if (face.enabled !== false) {
        const rawUv = Array.isArray(face.uv) && face.uv.length === 4 ? face.uv : boxUvs?.[faceName];
        if (rawUv) {
          let uvW = resW;
          let uvH = resH;
          if (perTextureUv && texEntry) {
            uvW = positiveNumber(texEntry.tex.uv_width, resW);
            uvH = positiveNumber(texEntry.tex.uv_height, resH);
          }
          out.uv = rawUv.map((n, i) => roundNumber((n * 16) / (i % 2 ? uvH : uvW))) as [number, number, number, number];
        }
      }
      if (face.rotation) {
        const r = ((Math.round(face.rotation) % 360) + 360) % 360;
        if (r % 90 !== 0) invalidUvRotation++;
        else if (r !== 0) out.rotation = r;
      }
      if (texEntry) {
        usedTextureIndices.add(texEntry.index);
        out.texture = `#${textureKey(texEntry.tex, texEntry.index, textureEntries)}`;
      } else {
        missingFaceCount++;
      }
      if (face.cullface) out.cullface = face.cullface;
      if (typeof face.tint === 'number' && face.tint >= 0) out.tintindex = face.tint;
      element.faces[faceName] = out;
    }
    if (Object.keys(element.faces).length === 0) continue;

    if ([...from, ...to].some((v) => v < COORD_MIN || v > COORD_MAX)) outOfBounds++;
    elements.push(element);
  }

  if (skippedNonCubes > 0) {
    issues.push({
      level: 'warning',
      message: `${skippedNonCubes} Element(e) sind keine Würfel (z.B. Meshes) und können im Java-Format nicht exportiert werden. Sie wurden übersprungen.`,
    });
  }
  if (missingFaceCount > 0) {
    issues.push({
      level: 'warning',
      message: `${missingFaceCount} Fläche(n) haben keine Textur und werden in Minecraft lila/schwarz angezeigt. In Blockbench eine Textur zuweisen oder die Fläche deaktivieren.`,
    });
  }
  if (outOfBounds > 0) {
    issues.push({
      level: 'error',
      message: `${outOfBounds} Würfel liegen außerhalb des erlaubten Bereichs von -16 bis 32. Minecraft lädt solche Modelle nicht. In Blockbench das Modell verkleinern (z.B. über die Display-Skalierung) oder verschieben.`,
    });
  }
  if (invalidUvRotation > 0) {
    issues.push({ level: 'error', message: `${invalidUvRotation} Fläche(n) haben eine UV-Rotation, die kein Vielfaches von 90° ist.` });
  }
  if (!isJava && hasRotatedGroups(model.outliner)) {
    issues.push({ level: 'warning', message: 'Das Modell enthält rotierte Gruppen. Diese Rotationen werden im Java-Format nicht übernommen.' });
  }
  if (requiresVersion) {
    issues.push({
      level: 'info',
      message: `Das Modell nutzt Rotationen/Features, die mindestens Minecraft ${requiresVersion} benötigen.`,
    });
  }

  /* ------------------------------------------------------------ Assemble textures */
  const isTexturesOnlyModel = elements.length === 0 && !!model.parent;
  const textures: ModelTexture[] = [];
  const texturesJson: Record<string, string> = {};
  for (const entry of textureEntries) {
    const used = usedTextureIndices.has(entry.index);
    const particle = entry.tex.particle === true;
    if (!used && !isTexturesOnlyModel && !particle) continue;
    if (entry.tex.pbr_channel && entry.tex.pbr_channel !== 'color' && !used) continue;

    const id = `t${textures.length}`;
    const mcmeta =
      buildBBTextureMcmeta(entry.tex, entry.dataUrl, perTextureUv ? entry.tex : undefined, resW, resH) ??
      findMcmetaFor(extraFiles, entry.displayName);
    const texture = createTexture(id, entry.displayName, entry.dataUrl ?? '', mcmeta);
    textures.push(texture);
    if (!entry.dataUrl) {
      issues.push({
        level: 'error',
        message: `Die Textur „${entry.displayName}“ ist nicht in der .bbmodel-Datei eingebettet. Bitte die PNG-Datei zusätzlich ablegen oder im Modell-Tab zuweisen.`,
      });
    }
    if (used || isTexturesOnlyModel) {
      texturesJson[textureKey(entry.tex, entry.index, textureEntries)] = texturePlaceholder(id);
    }
    if (particle) texturesJson.particle = texturePlaceholder(id);
  }
  if (!texturesJson.particle && textures.length > 0 && elements.length > 0) {
    // Without a particle texture, Minecraft shows missing particles when breaking (blocks).
    texturesJson.particle = texturePlaceholder(textures[0].id);
  }
  const unused = textureEntries.length - textures.length;
  if (unused > 0) {
    issues.push({ level: 'info', message: `${unused} ungenutzte Textur(en) wurden nicht übernommen.` });
  }

  /* ------------------------------------------------------------ Model JSON */
  const json: JavaModelJson = {};
  if (typeof model.parent === 'string' && model.parent.trim()) json.parent = model.parent.trim();
  if (model.ambientocclusion === false) json.ambientocclusion = false;
  if (model.front_gui_light === true) json.gui_light = 'front';
  if (resW !== 16 || resH !== 16) json.texture_size = [resW, resH];
  if (Object.keys(texturesJson).length > 0) json.textures = texturesJson;
  if (elements.length > 0) json.elements = elements;
  const display = convertDisplay(model.display);
  if (display) json.display = display;
  if (isPlainObject(model.unhandled_root_fields)) {
    for (const [key, value] of Object.entries(model.unhandled_root_fields)) {
      if (json[key] === undefined && key !== 'groups' && key !== 'overrides') json[key] = value;
    }
  }

  if (elements.length === 0 && !json.parent) {
    issues.push({ level: 'error', message: 'Das Modell enthält keine exportierbaren Würfel.' });
  }

  return {
    source: 'bbmodel',
    fileName,
    json,
    textures,
    issues,
    requiresVersion,
  };
}

/* ====================================================================== Helpers */

function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function vec3(value: unknown): [number, number, number] {
  const arr = Array.isArray(value) ? value : [];
  return [0, 1, 2].map((i) => (typeof arr[i] === 'number' && Number.isFinite(arr[i]) ? (arr[i] as number) : 0)) as [
    number,
    number,
    number,
  ];
}

/** Returns the texture key in the "textures" object (Blockbench: texture.id). */
function textureKey(tex: BBTexture, index: number, all: Array<{ tex: BBTexture; index: number }>): string {
  const raw = tex.id !== undefined && tex.id !== null && String(tex.id).trim() !== '' ? String(tex.id) : String(index);
  const key = raw.replace(/^#/, '');
  // Make duplicate IDs unique (Blockbench does something similar on import)
  const firstWithSameKey = all.find((e) => {
    const other = e.tex.id !== undefined && e.tex.id !== null && String(e.tex.id).trim() !== '' ? String(e.tex.id) : String(e.index);
    return other.replace(/^#/, '') === key;
  });
  return firstWithSameKey && firstWithSameKey.index !== index ? `${key}_${index}` : key;
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

function hasRotatedGroups(outliner: unknown[] | undefined): boolean {
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

/**
 * Animation data like Blockbench (Texture.getMCMetaContent): a texture counts as animated
 * if its aspect ratio does not match the UV grid.
 */
function buildBBTextureMcmeta(
  tex: BBTexture,
  dataUrl: string | undefined,
  perTexture: BBTexture | undefined,
  resW: number,
  resH: number,
): Record<string, unknown> | null {
  if (!dataUrl) return null;
  const probe = createTexture('probe', 'probe', dataUrl);
  if (!probe.width || !probe.height) return null;
  const uvW = perTexture ? positiveNumber(perTexture.uv_width, resW) : resW;
  const uvH = perTexture ? positiveNumber(perTexture.uv_height, resH) : resH;
  const ratio = probe.width / probe.height;
  if (Math.abs(ratio - uvW / uvH) < 1e-9) return null;
  const frameCount = Math.ceil(uvW / uvH / ratio - 0.05);
  if (frameCount <= 1) return null;

  const animation: Record<string, unknown> = {
    frametime: positiveNumber(tex.frame_time, 1),
  };
  const frameWidth = probe.width;
  const frameHeight = probe.height / frameCount;
  if (frameWidth !== frameHeight) {
    animation.width = frameWidth;
    animation.height = Number.isInteger(frameHeight) ? frameHeight : roundNumber(frameHeight, 3);
  }
  if (tex.frame_interpolate) animation.interpolate = true;
  const frames = frameIndices(tex, frameCount);
  if (frames) animation.frames = frames;
  return { animation };
}

function frameIndices(tex: BBTexture, count: number): Array<number | { index: number; time: number }> | undefined {
  if (tex.frame_order_type === 'backwards') {
    return Array.from({ length: count }, (_, i) => count - 1 - i);
  }
  if (tex.frame_order_type === 'back_and_forth') {
    return Array.from({ length: count * 2 - 2 }, (_, i) => (i >= count - 1 ? count * 2 - 2 - i : i));
  }
  if (tex.frame_order_type === 'custom' && typeof tex.frame_order === 'string' && tex.frame_order.trim()) {
    return tex.frame_order
      .trim()
      .split(/\s+/)
      .map((part) => {
        if (part.includes(':')) {
          const [index, time] = part.split(':').map((v) => parseInt(v, 10));
          return { index, time };
        }
        return parseInt(part, 10);
      })
      .filter((v) => (typeof v === 'number' ? Number.isFinite(v) : Number.isFinite(v.index) && Number.isFinite(v.time)));
  }
  return undefined;
}

function convertDisplay(display: unknown): Record<string, JavaDisplayTransform> | undefined {
  if (!isPlainObject(display)) return undefined;
  const result: Record<string, JavaDisplayTransform> = {};
  for (const slot of DISPLAY_SLOTS) {
    const value = display[slot];
    if (!isPlainObject(value)) continue;
    const out: JavaDisplayTransform = {};
    for (const key of ['rotation', 'translation', 'scale', 'rotation_pivot', 'scale_pivot'] as const) {
      const v = value[key];
      if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number')) {
        out[key] = (v as number[]).map((n) => roundNumber(n));
      }
    }
    // Older .bbmodel files store "mirror" separately → convert to negative scale
    const mirror = value.mirror;
    if (Array.isArray(mirror) && mirror.some(Boolean)) {
      const scale = (out.scale as number[] | undefined) ?? [1, 1, 1];
      out.scale = scale.map((s, i) => (mirror[i] ? -Math.abs(s) : s));
    }
    if (Object.keys(out).length > 0) result[slot] = out;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
