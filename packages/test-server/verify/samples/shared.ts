/** Helpers for the plugin check's sample projects: real PNG and OGG files, flat and block models, configs as YAML. */
import {
  createFolder,
  createItem,
  insertFolder,
  insertItem,
  type ConfigObject,
  type Item,
  type Project,
} from '@resourcepackbuilder/core/project';
import { formFor } from '@resourcepackbuilder/core/targets';
import { createTextureModel, type ImportedModel, versionSupport } from '@resourcepackbuilder/minecraft';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';
import { parse } from 'yaml';

/** A 16×16 PNG in one colour (so each texture is a real, distinct image). */
export function png(seed: number, width = 16, height = 16): string {
  return makePngDataUrl(width, height, [(seed * 67) % 256, (seed * 131) % 256, (seed * 29) % 256, 255]);
}

/** A tiny Ogg file: the plugins only copy sounds into the pack, they never decode them. */
export const OGG = 'data:audio/ogg;base64,' + Buffer.from('OggS' + '\0'.repeat(60)).toString('base64');

let seed = 1;

/** A flat item model (`generated`, `handheld` …) with one texture of its own. */
export function flatModel(name: string, template: 'generated' | 'handheld' = 'generated'): ImportedModel {
  return createTextureModel(template, { layer0: `${name}.png` }, [{ name: `${name}.png`, dataUrl: png(seed++) }]);
}

/** A block model from a texture template: `cube_all`, `cube_column` (end, side), `cross` … one texture per slot. */
export function blockModel(
  name: string,
  template: 'cube_all' | 'cube_column' | 'cube_bottom_top' | 'orientable' | 'cross',
  slots: string[],
): ImportedModel {
  const files = slots.map((slot) => ({ name: `${name}_${slot}.png`, dataUrl: png(seed++) }));
  return createTextureModel(template, Object.fromEntries(slots.map((slot, i) => [slot, files[i].name])), files);
}

/** A config (or any value) written as YAML, the way the item YAML of the plugin reads. */
export function yaml(text: string): ConfigObject {
  return parse(text) as ConfigObject;
}

/** Adds a folder to the project and returns a function that adds items to it. */
export function folder(project: Project, name: string) {
  const created = createFolder(name, null);
  insertFolder(project, created);
  return (
    itemId: string,
    displayName: string,
    material: string,
    model: ImportedModel | null,
    edit: (item: Item) => void = () => {},
  ): Item => {
    const item = createItem({ displayName, itemId, folderId: created.id, material, model });
    edit(item);
    insertItem(project, item);
    return item;
  };
}

/**
 * Removes the properties the project's Minecraft version does not have (too new, or removed), as a user of that
 * version leaves them out; so a run for another version checks what that version can load.
 */
export function withoutUnsupported(project: Project): Project {
  const version = project.settings.minecraftVersion;
  for (const def of formFor(project.target).properties) {
    if (def.storage !== 'config' || versionSupport(version, def) === 'supported') continue;
    for (const item of Object.values(project.items)) {
      const parent = def.path.slice(0, -1).reduce<unknown>((node, key) => (isPlainObject(node) ? node[key] : undefined), item.config);
      if (isPlainObject(parent)) delete parent[def.path[def.path.length - 1]];
    }
  }
  return project;
}
