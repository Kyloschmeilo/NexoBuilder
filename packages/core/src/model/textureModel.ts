/**
 * Creates a model from one or more PNG textures based on a vanilla parent
 * (2D item, tool, cube block, plant …).
 */
import type { ImportedModel, Issue, JavaModelJson, ModelTexture } from '../types';
import { fileBaseName } from '../util';
import { ModelConversionError, texturePlaceholder } from './common';
import { createTexture, findMcmetaFor, isPngDataUrl, type DroppedFile } from './textures';

export interface TextureTemplate {
  id: string;
  parent: string;
  /** Message key in the `schema` namespace (`textureTemplates.<id>.label`) */
  label: string;
  /** Message key in the `schema` namespace (`textureTemplates.<id>.description`) */
  description: string;
  /** Texture keys that must be assigned */
  slots: string[];
  /** For 2D items: each further PNG becomes an additional layer (layer1, layer2 …) */
  multiLayer?: boolean;
  /** Suitable for custom blocks */
  block?: boolean;
}

/** Minecraft supports layers layer0 to layer4 for item/generated. */
export const MAX_ITEM_LAYERS = 5;

export const TEXTURE_TEMPLATES: TextureTemplate[] = [
  {
    id: 'generated',
    parent: 'minecraft:item/generated',
    label: 'textureTemplates.generated.label',
    description: 'textureTemplates.generated.description',
    slots: ['layer0'],
    multiLayer: true,
  },
  {
    id: 'handheld',
    parent: 'minecraft:item/handheld',
    label: 'textureTemplates.handheld.label',
    description: 'textureTemplates.handheld.description',
    slots: ['layer0'],
    multiLayer: true,
  },
  {
    id: 'handheld_rod',
    parent: 'minecraft:item/handheld_rod',
    label: 'textureTemplates.handheldRod.label',
    description: 'textureTemplates.handheldRod.description',
    slots: ['layer0'],
    multiLayer: true,
  },
  {
    id: 'cube_all',
    parent: 'minecraft:block/cube_all',
    label: 'textureTemplates.cubeAll.label',
    description: 'textureTemplates.cubeAll.description',
    slots: ['all'],
    block: true,
  },
  {
    id: 'cube_column',
    parent: 'minecraft:block/cube_column',
    label: 'textureTemplates.cubeColumn.label',
    description: 'textureTemplates.cubeColumn.description',
    slots: ['end', 'side'],
    block: true,
  },
  {
    id: 'cube_bottom_top',
    parent: 'minecraft:block/cube_bottom_top',
    label: 'textureTemplates.cubeBottomTop.label',
    description: 'textureTemplates.cubeBottomTop.description',
    slots: ['top', 'bottom', 'side'],
    block: true,
  },
  {
    id: 'orientable',
    parent: 'minecraft:block/orientable',
    label: 'textureTemplates.orientable.label',
    description: 'textureTemplates.orientable.description',
    slots: ['front', 'side', 'top'],
    block: true,
  },
  {
    id: 'cube',
    parent: 'minecraft:block/cube',
    label: 'textureTemplates.cube.label',
    description: 'textureTemplates.cube.description',
    slots: ['north', 'east', 'south', 'west', 'up', 'down'],
    block: true,
  },
  {
    id: 'cross',
    parent: 'minecraft:block/cross',
    label: 'textureTemplates.cross.label',
    description: 'textureTemplates.cross.description',
    slots: ['cross'],
    block: true,
  },
];

export function getTextureTemplate(id: string): TextureTemplate {
  return TEXTURE_TEMPLATES.find((t) => t.id === id) ?? TEXTURE_TEMPLATES[0];
}

/** Suggests a PNG → texture key assignment based on the file names. */
export function suggestSlotAssignment(template: TextureTemplate, pngs: DroppedFile[]): Record<string, string> {
  const names = pngs.map((p) => p.name);
  const result: Record<string, string> = {};
  if (template.multiLayer) {
    names.slice(0, MAX_ITEM_LAYERS).forEach((name, i) => {
      result[`layer${i}`] = name;
    });
    return result;
  }
  const synonyms: Record<string, string[]> = {
    end: ['end', 'top', 'bottom'],
    top: ['top', 'up', 'end'],
    bottom: ['bottom', 'down', 'end'],
    up: ['up', 'top'],
    down: ['down', 'bottom'],
    side: ['side', 'sides'],
    front: ['front'],
  };
  const remaining = [...names];
  for (const slot of template.slots) {
    const words = synonyms[slot] ?? [slot];
    const match = remaining.find((name) => {
      const base = fileBaseName(name).toLowerCase();
      return words.some((w) => base === w || base.endsWith(`_${w}`) || base.endsWith(`-${w}`));
    });
    if (match) {
      result[slot] = match;
      remaining.splice(remaining.indexOf(match), 1);
    }
  }
  for (const slot of template.slots) {
    if (!result[slot] && remaining.length > 0) result[slot] = remaining.shift()!;
  }
  return result;
}

export function createTextureModel(
  templateId: string,
  assignment: Record<string, string>,
  files: DroppedFile[],
): ImportedModel {
  const template = getTextureTemplate(templateId);
  const pngs = files.filter((f) => isPngDataUrl(f.dataUrl));
  if (pngs.length === 0) throw new ModelConversionError('model.noPngDropped');

  const issues: Issue[] = [];
  const textures: ModelTexture[] = [];
  const texturesJson: Record<string, string> = {};
  const idByFile = new Map<string, string>();

  const slots = template.multiLayer
    ? Object.keys(assignment)
        .filter((k) => /^layer\d+$/.test(k))
        .sort((a, b) => parseInt(a.slice(5), 10) - parseInt(b.slice(5), 10))
    : template.slots;

  let layerIndex = 0;
  for (const slot of slots) {
    const fileName = assignment[slot];
    const file = fileName ? pngs.find((p) => p.name === fileName) : undefined;
    if (!file) {
      if (!template.multiLayer) {
        issues.push({ level: 'error', code: 'model.slotUnassigned', params: { slot } });
      }
      continue;
    }
    if (template.multiLayer && layerIndex >= MAX_ITEM_LAYERS) {
      issues.push({ level: 'warning', code: 'model.tooManyLayers', params: { max: MAX_ITEM_LAYERS, file: file.name } });
      continue;
    }
    let id = idByFile.get(file.name);
    if (!id) {
      id = `t${textures.length}`;
      textures.push(createTexture(id, fileBaseName(file.name), file.dataUrl!, findMcmetaFor(files, file.name)));
      idByFile.set(file.name, id);
    }
    const key = template.multiLayer ? `layer${layerIndex++}` : slot;
    texturesJson[key] = texturePlaceholder(id);
  }
  if (textures.length === 0) throw new ModelConversionError('model.noTextureAssigned');
  if (template.id === 'cube' && !texturesJson.particle) {
    texturesJson.particle = texturesJson.north ?? Object.values(texturesJson)[0];
  }

  const unused = pngs.filter((p) => !idByFile.has(p.name));
  for (const png of unused) {
    issues.push({ level: 'warning', code: 'model.pngUnassigned', params: { file: png.name } });
  }

  const json: JavaModelJson = {
    parent: template.parent,
    textures: texturesJson,
  };

  return {
    source: 'png',
    fileName: pngs[0].name,
    json,
    textures,
    issues,
  };
}
