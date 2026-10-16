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
 */
import { PACK_NAME_PATTERN } from '../minecraft/resourceLocation';
import { projectFileName } from '../nexo/projectFiles';
import { DEFAULT_PACK_NAME } from '../project/factory';
import { getFolderSlugs, isBlockItem } from '../project/tree';
import type { Item, Project } from '../project/types';

/** The Nexo plugin folder on a server; every exported config file is relative to it. */
export const NEXO_PLUGIN_DIR = 'plugins/Nexo';

/** `relativePath` (e.g. "sounds.yml") inside the Nexo plugin folder, as shown to users. */
export function nexoPluginPath(relativePath: string): string {
  return `${NEXO_PLUGIN_DIR}/${relativePath}`;
}

function textureDirFor(item: Item): 'item' | 'block' {
  return isBlockItem(item) ? 'block' : 'item';
}

/** Model path of an item's main model, e.g. "item/weapons/ruby_sword" */
export function modelPathFor(project: Project, item: Item): string {
  return [textureDirFor(item), ...getFolderSlugs(project, item.folderId), item.nexoId].join('/');
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

/** YAML file (relative to plugins/Nexo) for items in the folder `folderSlugs`; `nexoId` names it in "one file per item" mode. */
export function itemYamlFile(project: Project, folderSlugs: string[], nexoId: string): string {
  const dir = ['items', ...(project.settings.itemsInProjectFolder ? [projectFileName(project)] : []), ...folderSlugs];
  const fileName = project.settings.yamlFileMode === 'item' ? nexoId : (folderSlugs[folderSlugs.length - 1] ?? 'items');
  return `${dir.join('/')}/${fileName}.yml`;
}

/** YAML file of a folder's items; in "one file per item" mode with `itemPlaceholder` as file name. */
export function folderYamlFile(project: Project, folderId: string, itemPlaceholder = '<item_id>'): string {
  return itemYamlFile(project, getFolderSlugs(project, folderId), itemPlaceholder);
}

/** Name of the pack folder in pack/external_packs; an invalid name (reported by the checks) falls back to a default. */
export function exportPackName(project: Project): string {
  const name = project.settings.packName;
  return PACK_NAME_PATTERN.test(name) ? name : DEFAULT_PACK_NAME;
}

/** Location of the resource pack inside plugins/Nexo. */
export function packLocation(project: Project, asZip = project.settings.externalPackAsZip): string {
  const name = exportPackName(project);
  return asZip ? `pack/external_packs/${name}.zip` : `pack/external_packs/${name}/`;
}
