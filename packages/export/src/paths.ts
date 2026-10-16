/**
 * Where the export puts things.
 *
 * Resource pack (assets/<namespace>/…):
 *   models/{item|block}/<folder…>/<item_id>.json
 *   textures/{item|block}/<folder…>/<item_id>/<texture>.png   (+ .png.mcmeta)
 *   items/<folder…>/<item_id>.json                            (item model definitions)
 *   equipment/<set>.json + textures/entity/equipment/<layer>/<set>.png
 *   textures/glyphs/<glyph_id>.{png|gif}, textures/painting/<painting_id>.png, sounds/<sound path>.ogg
 *
 * Textures deliberately live under textures/item or textures/block: only these folders end up
 * automatically in Minecraft's item or block atlas (also from 1.21.11 on with separate atlases).
 *
 * The plugin side (item configs, recipes …) belongs to the pack target, e.g. targets/nexo/layout.ts.
 */
import { PACK_NAME_PATTERN } from '@resourcepackbuilder/minecraft';
import { DEFAULT_PACK_NAME, getFolderSlugs, isBlockItem, type Item, type Project } from '@resourcepackbuilder/core/project';

function textureDirFor(project: Project, item: Item): 'item' | 'block' {
  return isBlockItem(item, project.target) ? 'block' : 'item';
}

/** Model path of an item's main model, e.g. "item/weapons/ruby_sword" */
export function modelPathFor(project: Project, item: Item): string {
  return [textureDirFor(project, item), ...getFolderSlugs(project, item.folderId), item.itemId].join('/');
}

export function modelFile(namespace: string, modelPath: string): string {
  return `assets/${namespace}/models/${modelPath}.json`;
}

export function textureFile(namespace: string, texturePath: string): string {
  return `assets/${namespace}/textures/${texturePath}.png`;
}

export function itemModelDefinitionFile(namespace: string, path: string): string {
  return `assets/${namespace}/items/${path}.json`;
}

export function equipmentModelFile(namespace: string, setId: string): string {
  return `assets/${namespace}/equipment/${setId}.json`;
}

export function equipmentTextureFile(namespace: string, equipment: string, setId: string): string {
  return `assets/${namespace}/textures/entity/equipment/${equipment}/${setId}.png`;
}

/** Texture of a glyph; animated glyphs keep their GIF. */
export function glyphTextureFile(namespace: string, glyphId: string, format: 'png' | 'gif'): string {
  return `assets/${namespace}/textures/glyphs/${glyphId}.${format}`;
}

export function paintingTextureFile(namespace: string, paintingId: string): string {
  return textureFile(namespace, `painting/${paintingId}`);
}

/** An OGG file; `soundPath` is relative to assets/<ns>/sounds without extension (see soundFilePath). */
export function soundFile(namespace: string, soundPath: string): string {
  return `assets/${namespace}/sounds/${soundPath}.ogg`;
}

/**
 * Whether `path` stays inside the folder it is relative to: not absolute, no drive, no backslash, and no empty,
 * "." or ".." segment. Every path the export writes (pack, plugin files, archive entries) has to pass, so an odd
 * item ID or folder name can never reach outside the archive or the test server's plugin folder.
 */
export function isSafeRelativePath(path: string): boolean {
  if (!path || path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) return false;
  return path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

/** Name of the exported resource pack (its folder or ZIP); an invalid name (reported by the checks) falls back to a default. */
export function exportPackName(project: Project): string {
  const name = project.settings.packName;
  return PACK_NAME_PATTERN.test(name) ? name : DEFAULT_PACK_NAME;
}
