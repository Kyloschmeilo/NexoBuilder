/** Writes imported models with their textures into the pack. */
import type { Issue } from '../issues';
import { parseTexturePlaceholder } from '../model/common';
import { validateTexture } from '../model/textures';
import type { ImportedModel, JavaModelJson } from '../model/types';
import { deepClone } from '../object';
import type { Project } from '../project/types';
import { slugify } from '../text';
import type { PackWriter } from './packWriter';
import { modelFile, textureFile } from './paths';
import type { WrittenModel } from './types';
import { validateModel } from './validate/model';

/**
 * Writes the model to models/<modelPath>.json and its textures to textures/<modelPath>/<name>.png.
 * Issues of the textures and of the model are passed to `report`.
 */
export function writeModel(writer: PackWriter, project: Project, model: ImportedModel, modelPath: string, report: (issue: Issue) => void): WrittenModel {
  const ns = project.namespace;
  const textureRefs = new Map<string, string>();
  const usedNames = new Set<string>();
  for (const texture of model.textures) {
    const base = slugify(texture.name, 'texture');
    let name = base;
    for (let n = 2; usedNames.has(name); n++) name = `${base}_${n}`;
    usedNames.add(name);
    const texturePath = `${modelPath}/${name}`;
    textureRefs.set(texture.id, `${ns}:${texturePath}`);
    validateTexture(texture).forEach(report);
    if (texture.dataUrl) writer.texture(textureFile(ns, texturePath), texture, { report });
  }
  const json = resolveModelTextures(model.json, textureRefs);
  validateModel(json, project.settings.minecraftVersion, new Set(textureRefs.values())).forEach(report);
  const file = modelFile(ns, modelPath);
  writer.json(file, json);
  return { key: `${ns}:${modelPath}`, file, json };
}

/** Replaces the texture placeholders in the model with the final paths (unknown ones are removed). */
function resolveModelTextures(model: JavaModelJson, refs: Map<string, string>): JavaModelJson {
  const result = deepClone(model);
  if (result.textures) {
    for (const [key, value] of Object.entries(result.textures)) {
      const id = parseTexturePlaceholder(value);
      if (!id) continue;
      const ref = refs.get(id);
      if (ref) result.textures[key] = ref;
      else delete result.textures[key];
    }
  }
  return result;
}
