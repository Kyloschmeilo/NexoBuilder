/**
 * Erkennt, was abgelegt wurde (.bbmodel, JSON + PNG oder nur PNG), und erzeugt daraus
 * einen oder mehrere Import-Entwürfe für neue Items.
 */
import type { ImportedModel } from '../core/types';
import { convertBBModel } from '../core/model/bbmodel';
import { convertJavaModel } from '../core/model/javaModel';
import { createTextureModel, getTextureTemplate, suggestSlotAssignment, TEXTURE_TEMPLATES } from '../core/model/textureModel';
import { isPngDataUrl, normalizeTextureName, type DroppedFile } from '../core/model/textures';
import { fileBaseName, isPlainObject } from '../core/util';
import { prettyNameFromFile } from './files';

export type ImportKind = 'bbmodel' | 'json' | 'png';

export interface ImportDraft {
  key: string;
  kind: ImportKind;
  files: DroppedFile[];
  name: string;
  /** Nur bei PNG-Importen */
  template?: string;
  assignment?: Record<string, string>;
  model: ImportedModel | null;
  error: string | null;
}

let draftCounter = 0;

export function isBBModel(file: DroppedFile) {
  return /\.bbmodel$/i.test(file.name);
}
export function isJsonModel(file: DroppedFile) {
  return /\.json$/i.test(file.name) && !/\.mcmeta$/i.test(file.name);
}
export function isPng(file: DroppedFile) {
  return isPngDataUrl(file.dataUrl);
}

export function unsupportedFiles(files: DroppedFile[]): DroppedFile[] {
  return files.filter((f) => !isBBModel(f) && !isJsonModel(f) && !isPng(f) && !/\.mcmeta$/i.test(f.name));
}

/** Teilt die abgelegten Dateien in einen oder mehrere Entwürfe auf. */
export function createDrafts(files: DroppedFile[], pngMode: 'auto' | 'separate' | 'combined' = 'auto'): ImportDraft[] {
  const bbmodels = files.filter(isBBModel);
  const jsons = files.filter(isJsonModel);
  const pngs = files.filter(isPng);
  const mcmetas = files.filter((f) => /\.mcmeta$/i.test(f.name));

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
  if (pngs.length > 0) {
    const combined = pngMode === 'combined' || (pngMode === 'auto' && shouldCombinePngs(pngs));
    if (!combined) {
      return pngs.map((png) => {
        const meta = mcmetas.filter((m) => normalizeTextureName(m.name) === normalizeTextureName(png.name));
        const template = 'generated';
        const draftFiles = [png, ...meta];
        return runDraft({
          kind: 'png',
          files: draftFiles,
          name: prettyNameFromFile(png.name),
          template,
          assignment: suggestSlotAssignment(getTextureTemplate(template), [png]),
        });
      });
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
  return [];
}

/** Führt die Konvertierung für einen Entwurf (erneut) aus. */
export function runDraft(input: Omit<ImportDraft, 'key' | 'model' | 'error'> & { key?: string }): ImportDraft {
  const draft: ImportDraft = { ...input, key: input.key ?? `d${++draftCounter}`, model: null, error: null };
  try {
    if (draft.kind === 'bbmodel') {
      const bb = draft.files.find(isBBModel)!;
      draft.model = convertBBModel(bb.text ?? '', bb.name, draft.files.filter((f) => f !== bb));
    } else if (draft.kind === 'json') {
      draft.model = convertJavaModel(draft.files);
    } else {
      draft.model = createTextureModel(draft.template ?? 'generated', draft.assignment ?? {}, draft.files);
    }
  } catch (err) {
    draft.error = (err as Error).message;
  }
  return draft;
}

function shouldCombinePngs(pngs: DroppedFile[]): boolean {
  if (pngs.length === 1) return true;
  if (pngs.length > 6) return false;
  const prefix = commonPrefix(pngs.map((p) => fileBaseName(p.name).toLowerCase()));
  return prefix.replace(/[_-]+$/, '').length >= 3;
}

function suggestTemplate(pngs: DroppedFile[]): string {
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

function parseJson(file: DroppedFile): Record<string, unknown> | null {
  try {
    const value = JSON.parse(file.text ?? '') as unknown;
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
}

/** Gruppiert JSON-Modelle, die über "parent" zusammenhängen. */
function groupJsonModels(jsons: DroppedFile[]): DroppedFile[][] {
  const parentOf = new Map<DroppedFile, DroppedFile | undefined>();
  for (const file of jsons) {
    const parent = parseJson(file)?.parent;
    const parentName = typeof parent === 'string' ? normalizeTextureName(parent.split('/').pop() ?? parent) : null;
    parentOf.set(file, parentName ? jsons.find((j) => j !== file && normalizeTextureName(j.name) === parentName) : undefined);
  }
  const rootOf = (file: DroppedFile) => {
    let current = file;
    const seen = new Set<DroppedFile>();
    while (parentOf.get(current) && !seen.has(current)) {
      seen.add(current);
      current = parentOf.get(current)!;
    }
    return current;
  };
  const groups = new Map<DroppedFile, DroppedFile[]>();
  for (const file of jsons) {
    const root = rootOf(file);
    groups.set(root, [...(groups.get(root) ?? []), file]);
  }
  // Gruppen, deren Wurzel nur Parent ist, haben genau ein „Kind“-Modell als Hauptmodell
  return [...groups.values()];
}

function mainJsonName(group: DroppedFile[]): string {
  const referenced = new Set(
    group
      .map((f) => parseJson(f)?.parent)
      .filter((p): p is string => typeof p === 'string')
      .map((p) => normalizeTextureName(p.split('/').pop() ?? p)),
  );
  return (group.find((f) => !referenced.has(normalizeTextureName(f.name))) ?? group[0]).name;
}

function textureReferenceNames(group: DroppedFile[]): Set<string> {
  const names = new Set<string>();
  for (const file of group) {
    const textures = parseJson(file)?.textures;
    if (!isPlainObject(textures)) continue;
    for (const value of Object.values(textures)) {
      if (typeof value === 'string' && !value.startsWith('#')) {
        const path = value.includes(':') ? value.split(':')[1] : value;
        names.add(normalizeTextureName(path.split('/').pop() ?? path));
      }
    }
  }
  return names;
}

export { TEXTURE_TEMPLATES };
