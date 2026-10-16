/**
 * Import drafts: detects what was dropped (.bbmodel, JSON + PNG or only PNG) and converts it into
 * one or more models for new items.
 */
import { isPngDataUrl } from '../binary/png';
import { CoreError, fileBaseName, jsonOrNull, prettyNameFromFile, uid } from '@resourcepackbuilder/utils';
import { resourceBaseName } from '../minecraft/resourceLocation';
import { convertBBModel } from './bbmodel';
import { convertJavaModel, parentBaseName, parseModelJson, pickMainModel } from './javaModel';
import {
  createTextureModel,
  DEFAULT_TEXTURE_TEMPLATE,
  getTextureTemplate,
  suggestSlotAssignment,
  type TextureTemplateId,
} from './textureModel';
import { normalizeTextureName } from './textures';
import type { ImportedModel, ImportFile, JavaModelJson, ModelSource } from './types';

export interface ImportDraft {
  key: string;
  kind: ModelSource;
  files: ImportFile[];
  /** Suggested item name */
  name: string;
  /** Only for PNG imports */
  template?: TextureTemplateId;
  assignment?: Record<string, string>;
  model: ImportedModel | null;
  /** Why the model could not be converted */
  error: CoreError | null;
}

export type DraftInput = Omit<ImportDraft, 'key' | 'model' | 'error'> & { key?: string };

/** How several PNGs become drafts: one model each, one model together or decided by the names. */
export type PngMode = 'auto' | 'separate' | 'combined';

const isBBModelFile = (file: ImportFile) => /\.bbmodel$/i.test(file.name);
const isJsonModelFile = (file: ImportFile) => /\.json$/i.test(file.name) && !/\.mcmeta$/i.test(file.name);
const isMcmetaFile = (file: ImportFile) => /\.mcmeta$/i.test(file.name);
const isPngFile = (file: ImportFile) => isPngDataUrl(file.dataUrl);

/** Dropped files that no importer can use. */
export function unsupportedFiles(files: ImportFile[]): ImportFile[] {
  return files.filter((f) => !isBBModelFile(f) && !isJsonModelFile(f) && !isPngFile(f) && !isMcmetaFile(f));
}

/** Splits the dropped files into one or more drafts. */
export function createDrafts(files: ImportFile[], pngMode: PngMode = 'auto'): ImportDraft[] {
  const bbmodels = files.filter(isBBModelFile);
  const jsons = files.filter(isJsonModelFile);
  const pngs = files.filter(isPngFile);
  const mcmetas = files.filter(isMcmetaFile);

  if (bbmodels.length > 0) {
    return bbmodels.map((bb) => runDraft({ kind: 'bbmodel', files: [bb, ...pngs, ...mcmetas], name: prettyNameFromFile(bb.name) }));
  }
  if (jsons.length > 0) {
    const groups = groupJsonModels(jsons);
    if (groups.length === 1) {
      return [runDraft({ kind: 'json', files: [...groups[0], ...pngs, ...mcmetas], name: prettyNameFromFile(mainJsonName(groups[0])) })];
    }
    return groups.map((group) => {
      const refs = textureReferenceNames(group);
      const matching = pngs.filter((p) => refs.has(normalizeTextureName(p.name)));
      const metas = mcmetas.filter((m) => matching.some((p) => normalizeTextureName(p.name) === normalizeTextureName(m.name)));
      return runDraft({ kind: 'json', files: [...group, ...matching, ...metas], name: prettyNameFromFile(mainJsonName(group)) });
    });
  }
  if (pngs.length === 0) return [];
  const combined = pngMode === 'combined' || (pngMode === 'auto' && shouldCombinePngs(pngs));
  if (!combined) {
    return pngs.map((png) =>
      runDraft({
        kind: 'png',
        files: [png, ...mcmetas.filter((m) => normalizeTextureName(m.name) === normalizeTextureName(png.name))],
        name: prettyNameFromFile(png.name),
        template: DEFAULT_TEXTURE_TEMPLATE,
        assignment: suggestSlotAssignment(getTextureTemplate(DEFAULT_TEXTURE_TEMPLATE), [png]),
      }),
    );
  }
  const template = suggestTemplate(pngs);
  return [
    runDraft({
      kind: 'png',
      files: [...pngs, ...mcmetas],
      name: prettyNameFromFile(commonPrefix(pngs.map((p) => fileBaseName(p.name))) || pngs[0].name),
      template,
      assignment: suggestSlotAssignment(getTextureTemplate(template), pngs),
    }),
  ];
}

/** Runs the conversion for a draft (again, e.g. after the template or assignment changed). */
export function runDraft(input: DraftInput): ImportDraft {
  const draft: ImportDraft = { ...input, key: input.key ?? uid('d_'), model: null, error: null };
  try {
    draft.model = convert(draft);
  } catch (err) {
    draft.error =
      err instanceof CoreError ? err : new CoreError('model.conversionFailed', { error: err instanceof Error ? err.message : String(err) });
  }
  return draft;
}

function convert(draft: ImportDraft): ImportedModel {
  switch (draft.kind) {
    case 'bbmodel': {
      const bb = draft.files.find(isBBModelFile);
      if (!bb) throw new CoreError('model.noBlockbenchModel', { file: draft.name });
      return convertBBModel(
        bb.text ?? '',
        bb.name,
        draft.files.filter((f) => f !== bb),
      );
    }
    case 'json':
      return convertJavaModel(draft.files);
    case 'png':
      return createTextureModel(draft.template ?? DEFAULT_TEXTURE_TEMPLATE, draft.assignment ?? {}, draft.files);
  }
}

function shouldCombinePngs(pngs: ImportFile[]): boolean {
  if (pngs.length === 1) return true;
  if (pngs.length > 6) return false;
  const prefix = commonPrefix(pngs.map((p) => fileBaseName(p.name).toLowerCase()));
  return prefix.replace(/[_-]+$/, '').length >= 3;
}

function suggestTemplate(pngs: ImportFile[]): TextureTemplateId {
  if (pngs.length === 1) return 'generated';
  const names = pngs.map((p) => fileBaseName(p.name).toLowerCase());
  const has = (word: string) => names.some((n) => n.endsWith(word));
  if (pngs.length === 2 && (has('_end') || has('_top')) && has('_side')) return 'cube_column';
  if (pngs.length === 3 && has('_top') && has('_bottom') && has('_side')) return 'cube_bottom_top';
  if (pngs.length === 3 && has('_front')) return 'orientable';
  if (pngs.length === 6) return 'cube';
  return 'generated';
}

function commonPrefix(values: string[]): string {
  if (values.length === 0) return '';
  let prefix = values[0];
  for (const v of values.slice(1)) {
    while (!v.startsWith(prefix) && prefix) prefix = prefix.slice(0, -1);
  }
  return prefix.replace(/[_\- ]+$/, '');
}

/** The model JSON of a dropped file, null when it is none (the conversion reports why). */
function parseJson(file: ImportFile): JavaModelJson | null {
  return jsonOrNull(parseModelJson(file.text ?? '', file.name))?.json ?? null;
}

/** Base name of the file's parent reference ("minecraft:item/foo" → "foo"). */
function parentName(file: ImportFile): string | null {
  return parentBaseName(parseJson(file));
}

/** Groups JSON models that are linked via "parent". */
function groupJsonModels(jsons: ImportFile[]): ImportFile[][] {
  const parentOf = new Map<ImportFile, ImportFile>();
  for (const file of jsons) {
    const name = parentName(file);
    const parent = name ? jsons.find((j) => j !== file && normalizeTextureName(j.name) === name) : undefined;
    if (parent) parentOf.set(file, parent);
  }
  const rootOf = (file: ImportFile) => {
    let current = file;
    const seen = new Set<ImportFile>();
    for (let parent = parentOf.get(current); parent && !seen.has(current); parent = parentOf.get(current)) {
      seen.add(current);
      current = parent;
    }
    return current;
  };
  const groups = new Map<ImportFile, ImportFile[]>();
  for (const file of jsons) {
    const root = rootOf(file);
    groups.set(root, [...(groups.get(root) ?? []), file]);
  }
  return [...groups.values()];
}

/** The model of a group that no other model uses as parent. */
function mainJsonName(group: ImportFile[]): string {
  return pickMainModel(group.map((file) => ({ name: file.name, json: parseJson(file) }))).name;
}

function textureReferenceNames(group: ImportFile[]): Set<string> {
  const names = new Set<string>();
  for (const file of group) {
    const textures = parseJson(file)?.textures;
    for (const value of Object.values(textures ?? {})) {
      if (!value.startsWith('#')) names.add(normalizeTextureName(resourceBaseName(value)));
    }
  }
  return names;
}
