/**
 * Import of an existing Minecraft Java model (JSON) including PNG textures.
 *
 * - Texture references ("namespace:path/name") are matched to the dropped PNGs by file name.
 * - If several JSON files are dropped, one of which references the other as "parent",
 *   they are merged into one model (like Blockbench "Resolve parent").
 * - References to vanilla textures (minecraft:...) without a matching PNG are kept.
 */
import { isPngDataUrl } from '../binary/png';
import { CoreError, type Issue } from '../issues';
import { isVanillaReference, resourceBaseName, stripMinecraftNamespace } from '../minecraft/resourceLocation';
import { ELEMENTLESS_ITEM_PARENTS } from '../minecraft/vanillaModels';
import { FEATURE_VERSIONS, maxVersion } from '../minecraft/versions';
import { deepClone, isPlainObject } from '../object';
import { fileBaseName } from '../text';
import { texturePlaceholder } from '../tokens';
import { FACE_NAMES, isOutOfBounds } from './geometry';
import { createTexture, findMcmetaFor, normalizeTextureName } from './textures';
import type { ImportedModel, ImportFile, JavaModelElement, JavaModelJson, ModelTexture } from './types';

interface ParsedJson {
  name: string;
  json: JavaModelJson;
}

export function convertJavaModel(files: ImportFile[]): ImportedModel {
  const jsonFiles = files.filter((f) => /\.json$/i.test(f.name) && typeof f.text === 'string');
  if (jsonFiles.length === 0) throw new CoreError('model.noJsonFile');

  const parsed: ParsedJson[] = jsonFiles.map((file) => {
    let json: JavaModelJson | null;
    try {
      json = parseModelJson(file.text ?? '');
    } catch (err) {
      throw new CoreError('model.invalidJson', { file: file.name, error: err instanceof Error ? err.message : String(err) });
    }
    if (!json) throw new CoreError('model.notMinecraftModel', { file: file.name });
    return { name: file.name, json };
  });

  const issues: Issue[] = [];
  const main = pickMainModel(parsed);
  if (!main.json.elements && !main.json.parent && !main.json.textures) {
    throw new CoreError('model.notMinecraftModelEmpty', { file: main.name });
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
    issues.push({ level: 'error', code: 'model.fileNotPng', args: { file: f.name } });
  }

  const textures: ModelTexture[] = [];
  const texturesJson: Record<string, string> = {};
  const usedPngs = new Set<ImportFile>();
  const byReference = new Map<string, string>(); // reference → texture ID
  const unresolved = new Map<string, string[]>(); // reference → texture keys

  const addTexture = (png: ImportFile, ref: string): string => {
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
    issues.push({ level: 'info', code: 'model.textureAutoAssigned', args: { file: png.name, ref } });
  }

  for (const [ref, keys] of unresolved) {
    const args = { keys: keys.join(', '), ref };
    if (isVanillaReference(ref)) {
      issues.push({ level: 'info', code: 'model.vanillaTexture', args });
    } else {
      issues.push({ level: 'error', code: 'model.texturePngMissing', args });
    }
  }
  const unusedPngs = pngFiles.filter((p) => !usedPngs.has(p));
  for (const png of unusedPngs) {
    issues.push({ level: 'warning', code: 'model.unusedPng', args: { file: png.name } });
  }

  const json: JavaModelJson = { ...merged };
  if (Object.keys(texturesJson).length > 0) json.textures = texturesJson;
  else delete json.textures;

  const analysis = analyseElements(json);
  issues.push(...analysis.issues);
  checkParent(json, issues);

  return {
    source: 'json',
    fileName: main.name,
    json,
    textures,
    issues,
    requiresVersion: analysis.requiresVersion,
  };
}

/**
 * Parses the text of a model JSON file (comments allowed). Null if it is no JSON object;
 * throws the parser's SyntaxError if it is no JSON at all.
 */
export function parseModelJson(text: string): JavaModelJson | null {
  const json: unknown = JSON.parse(stripJsonComments(text));
  return isPlainObject(json) ? (json as JavaModelJson) : null;
}

/** Normalised file name of the model's parent ("minecraft:item/foo" → "foo"), matching dropped file names. */
export function parentBaseName(json: JavaModelJson | null): string | null {
  return typeof json?.parent === 'string' ? normalizeTextureName(resourceBaseName(json.parent)) : null;
}

/** Picks the main model: the one not used as parent by any other. */
export function pickMainModel<T extends { name: string; json: JavaModelJson | null }>(models: T[]): T {
  if (models.length === 1) return models[0];
  const referenced = new Set(models.map((m) => parentBaseName(m.json)).filter((name) => name !== null));
  const candidates = models.filter((m) => !referenced.has(normalizeTextureName(m.name)));
  return candidates[0] ?? models[0];
}

/** Merges the parent chain, as far as the parent files were dropped too. */
function mergeParents(main: ParsedJson, all: ParsedJson[], issues: Issue[]): JavaModelJson {
  const stack: JavaModelJson[] = [main.json];
  const used = new Set<ParsedJson>([main]);
  let current = main.json;
  while (typeof current.parent === 'string' && stack.length < 32) {
    const parentName = parentBaseName(current);
    const parentFile = all.find((m) => !used.has(m) && normalizeTextureName(m.name) === parentName);
    if (!parentFile) break;
    used.add(parentFile);
    stack.push(parentFile.json);
    current = parentFile.json;
  }
  for (const m of all) {
    if (!used.has(m)) {
      issues.push({ level: 'warning', code: 'model.notInParentChain', args: { file: m.name, model: main.name } });
    }
  }
  if (stack.length === 1) return deepClone(main.json);

  const merged: JavaModelJson = {};
  // The child wins: each layer only fills what the layers above did not define
  for (const layer of stack) {
    for (const [key, value] of Object.entries(layer)) {
      if (key === 'parent') continue;
      if (key === 'textures' && layer.textures) merged.textures = { ...merged.textures, ...withoutKeys(layer.textures, merged.textures) };
      else if (key === 'display' && layer.display) merged.display = { ...merged.display, ...withoutKeys(layer.display, merged.display) };
      else if (merged[key] === undefined) merged[key] = deepClone(value);
    }
  }
  const last = stack[stack.length - 1];
  if (typeof last.parent === 'string') merged.parent = last.parent;
  issues.push({ level: 'info', code: 'model.parentsMerged', args: { count: stack.length - 1 } });
  return merged;
}

/** The entries of `source` that `existing` does not define. */
function withoutKeys<T>(source: Record<string, T>, existing: Record<string, T> | undefined): Record<string, T> {
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => existing?.[key] === undefined)
      .map(([key, value]) => [key, deepClone(value)]),
  );
}

/** Matches a texture reference ("ns:item/foo") to a dropped PNG. */
function matchPng(pngs: ImportFile[], ref: string, used: Set<ImportFile>): ImportFile | undefined {
  const base = normalizeTextureName(resourceBaseName(ref));
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

export interface ElementAnalysis {
  issues: Issue[];
  /** Minimum Minecraft version the elements need */
  requiresVersion?: string;
}

/**
 * Checks the elements for things Minecraft cannot load and determines the required version.
 * Runs on every imported model and again on export.
 */
export function analyseElements(json: JavaModelJson): ElementAnalysis {
  const issues: Issue[] = [];
  let requiresVersion: string | undefined;
  const elements: JavaModelElement[] = Array.isArray(json.elements) ? json.elements : [];
  let outOfBounds = 0;
  let badUvRotation = 0;
  let invalid = 0;
  for (const el of elements) {
    if (!Array.isArray(el.from) || !Array.isArray(el.to) || el.from.length !== 3 || el.to.length !== 3) {
      invalid++;
      continue;
    }
    if (isOutOfBounds([...el.from, ...el.to])) outOfBounds++;
    const rot = el.rotation;
    if (rot) {
      if (typeof rot.angle === 'number' && rot.axis) {
        if (Math.abs(rot.angle) > 45) {
          requiresVersion = maxVersion(requiresVersion, FEATURE_VERSIONS.multiAxisRotation);
        } else if (Math.abs(rot.angle) % 22.5 !== 0) {
          requiresVersion = maxVersion(requiresVersion, FEATURE_VERSIONS.freeAngle);
        }
      } else if (rot.x !== undefined || rot.y !== undefined || rot.z !== undefined) {
        requiresVersion = maxVersion(requiresVersion, FEATURE_VERSIONS.multiAxisRotation);
      }
    }
    if (el.shade_direction_override) {
      requiresVersion = maxVersion(requiresVersion, FEATURE_VERSIONS.shadeDirectionOverride);
    }
    for (const face of FACE_NAMES) {
      const f = el.faces?.[face];
      if (f && typeof f.rotation === 'number' && f.rotation % 90 !== 0) badUvRotation++;
    }
  }
  if (invalid > 0) issues.push({ level: 'error', code: 'model.invalidElements', args: { count: invalid } });
  if (outOfBounds > 0) issues.push({ level: 'error', code: 'model.elementsOutOfBounds', args: { count: outOfBounds } });
  if (badUvRotation > 0) issues.push({ level: 'error', code: 'model.invalidUvRotation', args: { count: badUvRotation } });
  return { issues, requiresVersion };
}

function checkParent(json: JavaModelJson, issues: Issue[]) {
  if (typeof json.parent !== 'string') return;
  const parent = stripMinecraftNamespace(json.parent);
  if (!isVanillaReference(json.parent)) {
    issues.push({ level: 'warning', code: 'model.customParent', args: { parent: json.parent } });
  } else if (!json.elements && !ELEMENTLESS_ITEM_PARENTS.includes(parent) && !parent.startsWith('block/') && !parent.startsWith('item/')) {
    issues.push({ level: 'info', code: 'model.vanillaParent', args: { parent: json.parent } });
  }
}
