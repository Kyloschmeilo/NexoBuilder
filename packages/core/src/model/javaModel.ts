/**
 * Import of an existing Minecraft Java model (JSON) including PNG textures.
 *
 * - Texture references ("namespace:path/name") are matched to the dropped PNGs by file name.
 * - If several JSON files are dropped, one of which references the other as "parent",
 *   they are merged into one model (like Blockbench "Resolve parent").
 * - References to vanilla textures (minecraft:...) without a matching PNG are kept.
 */
import type { FaceName, ImportedModel, Issue, JavaModelElement, JavaModelJson, ModelTexture } from '../types';
import { MODEL_FEATURE_VERSIONS } from '../minecraft/versions';
import { fileBaseName, isPlainObject, maxVersion } from '../util';
import { ModelConversionError, parseTexturePlaceholder, texturePlaceholder } from './common';
import { createTexture, findMcmetaFor, isPngDataUrl, normalizeTextureName, type DroppedFile } from './textures';

const FACE_NAMES: FaceName[] = ['north', 'east', 'south', 'west', 'up', 'down'];

interface ParsedJson {
  name: string;
  json: JavaModelJson;
}

/** Parent models Minecraft uses for 2D items (no elements needed here). */
const ITEM_PARENTS = [
  'item/generated',
  'item/handheld',
  'item/handheld_rod',
  'item/handheld_mace',
  'builtin/generated',
  'builtin/entity',
];

export function stripMinecraftNamespace(ref: string): string {
  return ref.startsWith('minecraft:') ? ref.slice('minecraft:'.length) : ref;
}

export function isVanillaReference(ref: string): boolean {
  return !ref.includes(':') || ref.startsWith('minecraft:');
}

export function convertJavaModel(files: DroppedFile[]): ImportedModel {
  const jsonFiles = files.filter((f) => /\.json$/i.test(f.name) && typeof f.text === 'string');
  if (jsonFiles.length === 0) throw new ModelConversionError('model.noJsonFile');

  const parsed: ParsedJson[] = jsonFiles.map((file) => {
    let json: unknown;
    try {
      json = JSON.parse(stripJsonComments(file.text ?? ''));
    } catch (err) {
      throw new ModelConversionError('model.invalidJson', { file: file.name, error: (err as Error).message });
    }
    if (!isPlainObject(json)) throw new ModelConversionError('model.notMinecraftModel', { file: file.name });
    return { name: file.name, json: json as JavaModelJson };
  });

  const issues: Issue[] = [];
  const main = pickMainModel(parsed);
  if (!main.json.elements && !main.json.parent && !main.json.textures) {
    throw new ModelConversionError('model.notMinecraftModelEmpty', { file: main.name });
  }
  const merged = mergeParents(main, parsed, issues);
  if ('overrides' in merged) {
    delete merged.overrides;
    issues.push({ level: 'info', code: 'model.overridesRemoved' });
  }
  delete merged.groups;

  const pngFiles = files.filter((f) => isPngDataUrl(f.dataUrl));
  const nonPngImages = files.filter((f) => /\.(jpe?g|gif|webp|bmp|tga)$/i.test(f.name));
  for (const f of nonPngImages) {
    issues.push({ level: 'error', code: 'model.fileNotPng', params: { file: f.name } });
  }

  const textures: ModelTexture[] = [];
  const texturesJson: Record<string, string> = {};
  const usedPngs = new Set<DroppedFile>();
  const byReference = new Map<string, string>(); // reference → texture ID
  const unresolved = new Map<string, string[]>(); // reference → texture keys

  const addTexture = (png: DroppedFile, ref: string): string => {
    const id = `t${textures.length}`;
    textures.push(createTexture(id, fileBaseName(png.name), png.dataUrl!, findMcmetaFor(files, png.name)));
    usedPngs.add(png);
    byReference.set(ref, id);
    return id;
  };

  for (const [key, value] of Object.entries(merged.textures ?? {})) {
    if (typeof value !== 'string') continue;
    if (value.startsWith('#')) {
      texturesJson[key] = value;
      continue;
    }
    const existing = byReference.get(value);
    if (existing) {
      texturesJson[key] = texturePlaceholder(existing);
      continue;
    }
    const png = matchPng(pngFiles, value, usedPngs);
    if (png) {
      texturesJson[key] = texturePlaceholder(addTexture(png, value));
    } else {
      texturesJson[key] = value;
      unresolved.set(value, [...(unresolved.get(value) ?? []), key]);
    }
  }

  // Exactly one unassigned reference and exactly one leftover PNG → assign automatically
  const leftoverPngs = pngFiles.filter((p) => !usedPngs.has(p));
  const customUnresolved = [...unresolved.keys()].filter((ref) => !isVanillaReference(ref));
  const candidates = customUnresolved.length > 0 ? customUnresolved : [...unresolved.keys()];
  if (candidates.length === 1 && leftoverPngs.length === 1) {
    const ref = candidates[0];
    const png = leftoverPngs[0];
    const id = addTexture(png, ref);
    for (const key of unresolved.get(ref) ?? []) texturesJson[key] = texturePlaceholder(id);
    unresolved.delete(ref);
    issues.push({ level: 'info', code: 'model.textureAutoAssigned', params: { file: png.name, ref } });
  }

  for (const [ref, keys] of unresolved) {
    const params = { keys: keys.join(', '), ref };
    if (isVanillaReference(ref)) {
      issues.push({ level: 'info', code: 'model.vanillaTexture', params });
    } else {
      issues.push({ level: 'error', code: 'model.texturePngMissing', params });
    }
  }
  const unusedPngs = pngFiles.filter((p) => !usedPngs.has(p));
  for (const png of unusedPngs) {
    issues.push({ level: 'warning', code: 'model.unusedPng', params: { file: png.name } });
  }

  const json: JavaModelJson = { ...merged };
  if (Object.keys(texturesJson).length > 0) json.textures = texturesJson;
  else delete json.textures;

  const requiresVersion = analyseElements(json, issues);
  checkParent(json, issues);

  return {
    source: 'json',
    fileName: main.name,
    json,
    textures,
    issues,
    requiresVersion,
  };
}

/** Picks the main model: the one not used as parent by any other. */
function pickMainModel(models: ParsedJson[]): ParsedJson {
  if (models.length === 1) return models[0];
  const referenced = new Set(
    models
      .map((m) => m.json.parent)
      .filter((p): p is string => typeof p === 'string')
      .map((p) => normalizeTextureName(p.split('/').pop() ?? p)),
  );
  const candidates = models.filter((m) => !referenced.has(normalizeTextureName(m.name)));
  return candidates[0] ?? models[0];
}

/** Merges the parent chain, as far as the parent files were dropped too. */
function mergeParents(main: ParsedJson, all: ParsedJson[], issues: Issue[]): JavaModelJson {
  const stack: JavaModelJson[] = [main.json];
  const used = new Set<ParsedJson>([main]);
  let current = main.json;
  while (typeof current.parent === 'string' && stack.length < 32) {
    const parentName = normalizeTextureName(current.parent.split('/').pop() ?? current.parent);
    const parentFile = all.find((m) => !used.has(m) && normalizeTextureName(m.name) === parentName);
    if (!parentFile) break;
    used.add(parentFile);
    stack.push(parentFile.json);
    current = parentFile.json;
  }
  for (const m of all) {
    if (!used.has(m)) {
      issues.push({ level: 'warning', code: 'model.notInParentChain', params: { file: m.name, model: main.name } });
    }
  }
  if (stack.length === 1) return structuredCloneJson(main.json);

  const merged: JavaModelJson = {};
  for (const layer of stack) {
    for (const [key, value] of Object.entries(layer)) {
      if (key === 'parent') continue;
      if (key === 'textures' || key === 'display') {
        const target = (merged[key] ?? {}) as Record<string, unknown>;
        for (const [slot, slotValue] of Object.entries((value ?? {}) as Record<string, unknown>)) {
          if (target[slot] === undefined) target[slot] = slotValue;
        }
        merged[key] = target as never;
      } else if (merged[key] === undefined) {
        merged[key] = structuredCloneJson(value);
      }
    }
  }
  const last = stack[stack.length - 1];
  if (typeof last.parent === 'string') merged.parent = last.parent;
  issues.push({ level: 'info', code: 'model.parentsMerged', params: { count: stack.length - 1 } });
  return merged;
}

function structuredCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Matches a texture reference ("ns:item/foo") to a dropped PNG. */
function matchPng(pngs: DroppedFile[], ref: string, used: Set<DroppedFile>): DroppedFile | undefined {
  const path = ref.includes(':') ? ref.split(':')[1] : ref;
  const base = normalizeTextureName(path.split('/').pop() ?? path);
  const available = pngs.filter((p) => !used.has(p));
  return available.find((p) => normalizeTextureName(p.name) === base);
}

/** Removes // and /* *\/ comments (some tools write them into model JSONs). */
function stripJsonComments(text: string): string {
  let result = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inString) {
      result += c;
      if (c === '\\') {
        result += next ?? '';
        i++;
      } else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      result += c;
    } else if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      result += '\n';
    } else if (c === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
    } else {
      result += c;
    }
  }
  return result;
}

/**
 * Checks the elements for things Minecraft cannot load and determines the required version.
 * Also used for already imported models (e.g. during the export check).
 */
export function analyseElements(json: JavaModelJson, issues: Issue[]): string | undefined {
  let requiresVersion: string | undefined;
  const elements = Array.isArray(json.elements) ? (json.elements as JavaModelElement[]) : [];
  let outOfBounds = 0;
  let badUvRotation = 0;
  let invalid = 0;
  for (const el of elements) {
    if (!Array.isArray(el.from) || !Array.isArray(el.to) || el.from.length !== 3 || el.to.length !== 3) {
      invalid++;
      continue;
    }
    if ([...el.from, ...el.to].some((v) => typeof v !== 'number' || v < -16 || v > 32)) outOfBounds++;
    const rot = el.rotation;
    if (rot) {
      if (typeof rot.angle === 'number' && rot.axis) {
        if (Math.abs(rot.angle) > 45) {
          requiresVersion = maxVersion(requiresVersion, MODEL_FEATURE_VERSIONS.multiAxisRotation);
        } else if (Math.abs(rot.angle) % 22.5 !== 0) {
          requiresVersion = maxVersion(requiresVersion, MODEL_FEATURE_VERSIONS.freeAngle);
        }
      } else if (rot.x !== undefined || rot.y !== undefined || rot.z !== undefined) {
        requiresVersion = maxVersion(requiresVersion, MODEL_FEATURE_VERSIONS.multiAxisRotation);
      }
    }
    if (el.shade_direction_override) {
      requiresVersion = maxVersion(requiresVersion, MODEL_FEATURE_VERSIONS.shadeDirectionOverride);
    }
    for (const face of FACE_NAMES) {
      const f = el.faces?.[face];
      if (f && typeof f.rotation === 'number' && f.rotation % 90 !== 0) badUvRotation++;
    }
  }
  if (invalid > 0) issues.push({ level: 'error', code: 'model.invalidElements', params: { count: invalid } });
  if (outOfBounds > 0) {
    issues.push({ level: 'error', code: 'model.elementsOutOfBounds', params: { count: outOfBounds } });
  }
  if (badUvRotation > 0) {
    issues.push({ level: 'error', code: 'model.invalidUvRotation', params: { count: badUvRotation } });
  }
  return requiresVersion;
}

function checkParent(json: JavaModelJson, issues: Issue[]) {
  if (typeof json.parent !== 'string') return;
  const parent = stripMinecraftNamespace(json.parent);
  if (!isVanillaReference(json.parent)) {
    issues.push({ level: 'warning', code: 'model.customParent', params: { parent: json.parent } });
  } else if (!json.elements && !ITEM_PARENTS.includes(parent) && !parent.startsWith('block/') && !parent.startsWith('item/')) {
    issues.push({ level: 'info', code: 'model.vanillaParent', params: { parent: json.parent } });
  }
}

/** Lists the texture keys of a model that point to the given texture. */
export function textureKeysUsingTexture(json: JavaModelJson, textureId: string): string[] {
  return Object.entries(json.textures ?? {})
    .filter(([, v]) => parseTexturePlaceholder(v) === textureId)
    .map(([k]) => k);
}
