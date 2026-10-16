/**
 * What core and the preview need to know about vanilla model files: which parents draw 2D items,
 * the elements of the common block parents, and the display contexts of a model.
 */
import type { FaceName, JavaModelElement } from '../model/types';
import { stripMinecraftNamespace } from './resourceLocation';

/** Minecraft supports layers layer0 to layer4 for item/generated. */
export const MAX_ITEM_LAYERS = 5;

/** Parents that draw a flat item from the layer0…layer4 textures. */
export const GENERATED_ITEM_PARENTS: readonly string[] = [
  'item/generated',
  'item/handheld',
  'item/handheld_rod',
  'item/handheld_mace',
  'builtin/generated',
];

/** The parents a flat item model can switch between (how the item is held). */
export const HOLD_STYLE_PARENTS = ['item/generated', 'item/handheld', 'item/handheld_rod'] as const;
export type HoldStyleParent = (typeof HOLD_STYLE_PARENTS)[number];

/** The hold style of a flat item model, or null for models with their own elements or another parent. */
export function holdStyleParent(model: { parent?: string; elements?: unknown }): HoldStyleParent | null {
  if (model.elements) return null;
  const parent = stripMinecraftNamespace(model.parent ?? '');
  return HOLD_STYLE_PARENTS.find((candidate) => candidate === parent) ?? null;
}

/** Parents of items that need no elements of their own (2D items and entity-rendered items). */
export const ELEMENTLESS_ITEM_PARENTS: readonly string[] = [...GENERATED_ITEM_PARENTS, 'builtin/entity'];

/** Whether the parent ("minecraft:item/generated", "item/handheld" …) draws a flat layered item. */
export function isGeneratedItemParent(parent: string): boolean {
  return GENERATED_ITEM_PARENTS.includes(stripMinecraftNamespace(parent));
}

/** Texture key of each face of the full-block parents. */
const CUBE_PARENT_FACES: Record<string, Record<FaceName, string>> = {
  'block/cube': { down: 'down', up: 'up', north: 'north', south: 'south', west: 'west', east: 'east' },
  'block/cube_all': { down: 'all', up: 'all', north: 'all', south: 'all', west: 'all', east: 'all' },
  'block/cube_column': { down: 'end', up: 'end', north: 'side', south: 'side', west: 'side', east: 'side' },
  'block/cube_bottom_top': { down: 'bottom', up: 'top', north: 'side', south: 'side', west: 'side', east: 'side' },
  'block/orientable': { down: 'top', up: 'top', north: 'front', south: 'side', west: 'side', east: 'side' },
};

/** One plane of block/cross, rotated by 45° around y. */
function crossPlane(from: [number, number, number], to: [number, number, number], faces: FaceName[]): JavaModelElement {
  return {
    from,
    to,
    rotation: { origin: [8, 8, 8], axis: 'y', angle: 45, rescale: true },
    shade: false,
    faces: Object.fromEntries(faces.map((face) => [face, { uv: [0, 0, 16, 16], texture: '#cross' }])),
  };
}

/**
 * Elements of the common vanilla block parents (block/cube_all, block/cross …), so that models that
 * only set textures can be previewed. Null for other parents.
 */
export function vanillaParentElements(parent: string): JavaModelElement[] | null {
  const p = stripMinecraftNamespace(parent);
  const faces = CUBE_PARENT_FACES[p];
  if (faces) {
    const entries = Object.entries(faces).map(([face, key]) => [face, { texture: `#${key}` }]);
    return [{ from: [0, 0, 0], to: [16, 16, 16], faces: Object.fromEntries(entries) }];
  }
  if (p === 'block/cross') {
    return [crossPlane([0.8, 0, 8], [15.2, 16, 8], ['north', 'south']), crossPlane([8, 0, 0.8], [8, 16, 15.2], ['west', 'east'])];
  }
  return null;
}

/** Texture keys a vanilla parent reads (e.g. block/cube_column → end, side); null for unknown parents. */
export function vanillaParentTextureKeys(parent: string): string[] | null {
  const p = stripMinecraftNamespace(parent);
  if (isGeneratedItemParent(p)) return Array.from({ length: MAX_ITEM_LAYERS }, (_, i) => `layer${i}`);
  const elements = vanillaParentElements(p);
  if (!elements) return null;
  const keys = elements.flatMap((el) => Object.values(el.faces).map((face) => face?.texture.slice(1) ?? ''));
  return [...new Set(keys)].filter(Boolean);
}

/** Display contexts of a Java model (`display` keys), in Blockbench's order. */
export const DISPLAY_SLOTS = [
  'thirdperson_righthand',
  'thirdperson_lefthand',
  'firstperson_righthand',
  'firstperson_lefthand',
  'ground',
  'gui',
  'head',
  'embedded',
  'fixed',
  'on_shelf',
] as const;

export type DisplaySlot = (typeof DISPLAY_SLOTS)[number];
