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
  label: string;
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
    label: '2D-Item',
    description: 'Flaches Item wie Papier oder Edelsteine. Weitere PNGs werden als zusätzliche Ebenen übereinandergelegt.',
    slots: ['layer0'],
    multiLayer: true,
  },
  {
    id: 'handheld',
    parent: 'minecraft:item/handheld',
    label: '2D-Werkzeug / Waffe',
    description: 'Wie item/generated, wird aber wie ein Schwert oder eine Spitzhacke schräg in der Hand gehalten.',
    slots: ['layer0'],
    multiLayer: true,
  },
  {
    id: 'handheld_rod',
    parent: 'minecraft:item/handheld_rod',
    label: '2D-Stab / Angel',
    description: 'Wird wie eine Angel bzw. ein Stock in der Hand gehalten.',
    slots: ['layer0'],
    multiLayer: true,
  },
  {
    id: 'cube_all',
    parent: 'minecraft:block/cube_all',
    label: 'Block – eine Textur',
    description: 'Würfel mit derselben Textur auf allen Seiten (z.B. Erz, Stein).',
    slots: ['all'],
    block: true,
  },
  {
    id: 'cube_column',
    parent: 'minecraft:block/cube_column',
    label: 'Block – Säule',
    description: 'Oben/unten (end) und Seiten (side), z.B. Holzstämme.',
    slots: ['end', 'side'],
    block: true,
  },
  {
    id: 'cube_bottom_top',
    parent: 'minecraft:block/cube_bottom_top',
    label: 'Block – oben/unten/Seite',
    description: 'Eigene Texturen für oben, unten und die Seiten (z.B. Sandstein).',
    slots: ['top', 'bottom', 'side'],
    block: true,
  },
  {
    id: 'orientable',
    parent: 'minecraft:block/orientable',
    label: 'Block – mit Vorderseite',
    description: 'Vorderseite, Seiten und Oberseite (z.B. Ofen).',
    slots: ['front', 'side', 'top'],
    block: true,
  },
  {
    id: 'cube',
    parent: 'minecraft:block/cube',
    label: 'Block – sechs Seiten',
    description: 'Jede Seite bekommt eine eigene Textur.',
    slots: ['north', 'east', 'south', 'west', 'up', 'down'],
    block: true,
  },
  {
    id: 'cross',
    parent: 'minecraft:block/cross',
    label: 'Pflanze (Kreuz)',
    description: 'Zwei gekreuzte Flächen wie bei Blumen – ideal für StringBlocks.',
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
  if (pngs.length === 0) throw new ModelConversionError('Es wurde keine PNG-Textur abgelegt.');

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
        issues.push({ level: 'error', message: `Für „${slot}“ wurde keine Textur zugewiesen.` });
      }
      continue;
    }
    if (template.multiLayer && layerIndex >= MAX_ITEM_LAYERS) {
      issues.push({ level: 'warning', message: `Minecraft unterstützt maximal ${MAX_ITEM_LAYERS} Ebenen – „${file.name}“ wird ignoriert.` });
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
  if (textures.length === 0) throw new ModelConversionError('Es wurde keine Textur zugewiesen.');
  if (template.id === 'cube' && !texturesJson.particle) {
    texturesJson.particle = texturesJson.north ?? Object.values(texturesJson)[0];
  }

  const unused = pngs.filter((p) => !idByFile.has(p.name));
  for (const png of unused) {
    issues.push({ level: 'warning', message: `„${png.name}“ wurde keinem Textur-Schlüssel zugewiesen und wird ignoriert.` });
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
