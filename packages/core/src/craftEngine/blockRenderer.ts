/**
 * Block entity renderers: display entities CraftEngine shows at a block, set per state (or appearance) under
 * `entity_renderer`, as one element or a list. The elements take the keys of furniture elements (the editor shares
 * their card); their position is relative to the block's corner, by default its center (block displays: the corner).
 * `transparent: true` next to it hides the vanilla state's own model, so only the renderer shows.
 *
 * Keys and defaults come from the 26.9 plugin source (AbstractBlockManager, BlockEntityElementConfigs and the element
 * configs) and the jar's default_assets/configuration/blocks examples (sofa, table_lamp).
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject } from '../project/types';
import {
  builtDisplayElement,
  formatCeVector,
  furnitureElementPose,
  furnitureElementType,
  parseCeVector,
  type FurnitureElementPose,
  type Vec3,
} from './furniture';

/** The key the editor writes. */
export const CE_RENDERER_KEY = 'entity_renderer';
/** The keys CraftEngine reads the renderer from (`entity_render(er)` and their kebab-case spellings), in its order. */
const RENDERER_KEYS = ['entity_render', 'entity-render', 'entity_renderer', 'entity-renderer'];

/** The key the state's renderer is under, null without one. */
function rendererKey(state: Record<string, unknown>): string | null {
  return RENDERER_KEYS.find((key) => state[key] !== undefined && state[key] !== null) ?? null;
}

/** The elements of the state's renderer (one object or a list; other entries are left out), [] without one. */
export function rendererElements(state: Record<string, unknown>): Array<Record<string, unknown>> {
  const key = rendererKey(state);
  const value = key === null ? undefined : state[key];
  if (isPlainObject(value)) return [value];
  return Array.isArray(value) ? value.filter(isPlainObject) : [];
}

/** The state with the elements as its renderer (`entity_renderer`), without a renderer for none. */
export function withRendererElements(state: Record<string, unknown>, elements: ConfigObject[]): ConfigObject {
  const rest = Object.fromEntries(Object.entries(state).filter(([key]) => !RENDERER_KEYS.includes(key))) as ConfigObject;
  return elements.length > 0 ? { ...rest, [CE_RENDERER_KEY]: elements } : rest;
}

/** Whether the state hides its vanilla model (`transparent: true`). */
export function isTransparentState(state: Record<string, unknown>): boolean {
  return state.transparent === true;
}

/** A new element: an item display of the block's own item at the block's center. */
export function newRendererElement(): ConfigObject {
  return { type: 'item_display' };
}

/** Where an element of the type stands when it sets no position: block displays at the corner, others at the center. */
export function rendererDefaultPosition(type: string | null): Vec3 {
  return type === 'block_display' ? [0, 0, 0] : [0.5, 0.5, 0.5];
}

/** The pose of a renderer element for the preview, in the block's frame (blocks from its corner). */
export function rendererElementPose(element: Record<string, unknown>): FurnitureElementPose {
  return furnitureElementPose(element, rendererDefaultPosition(furnitureElementType(element)));
}

/** The state's renderer as the export writes it: each element with its type and, where it shows one, an item. */
export function buildRenderer(state: Record<string, unknown>, itemKey: string): Record<string, unknown> {
  const key = rendererKey(state);
  if (key === null) return state;
  const value = state[key];
  const build = (element: unknown) => (isPlainObject(element) ? builtDisplayElement(element, itemKey) : element);
  return { ...state, [key]: Array.isArray(value) ? value.map(build) : build(value) };
}

const round = (n: number) => Math.round(n * 1e6) / 1e6 + 0;

/**
 * The state's renderer turned around the block's vertical axis by `turn` degrees (a multiple of 90, clockwise seen
 * from above, as a model's `y`): each element's yaw grows by it (as the jar's table lamp turns its item) and its
 * position turns around the block's center. Dropped items (`item`) have no yaw, only their position turns.
 */
export function turnRenderer(state: Record<string, unknown>, turn: number): Record<string, unknown> {
  const key = rendererKey(state);
  const steps = (((Math.round(turn / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  if (key === null || steps === 0) return state;
  const turnElement = (value: unknown) => {
    if (!isPlainObject(value)) return value;
    const element: Record<string, unknown> = { ...value };
    const type = furnitureElementType(element);
    if (type !== 'item') {
      const yaw = (((Number(element.yaw) || 0) + steps * 90 + 180) % 360) - 180;
      if (yaw === 0) delete element.yaw;
      else element.yaw = yaw === -180 ? 180 : yaw;
    }
    const position = parseCeVector(element.position) ?? (element.position === undefined ? rendererDefaultPosition(type) : null);
    if (position) {
      const y = position[1];
      let [x, , z] = position;
      for (let i = 0; i < steps; i++) [x, z] = [1 - z, x];
      const turned: Vec3 = [round(x), round(y), round(z)];
      const unchanged = element.position === undefined && turned.every((n, i) => n === rendererDefaultPosition(type)[i]);
      if (!unchanged) element.position = formatCeVector(turned);
    }
    return element;
  };
  const value = state[key];
  return { ...state, [key]: Array.isArray(value) ? value.map(turnElement) : turnElement(value) };
}
