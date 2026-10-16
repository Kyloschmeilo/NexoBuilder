/** Geometry rules of the Java model format. */
import type { FaceName } from './types';

export const FACE_NAMES: readonly FaceName[] = ['north', 'east', 'south', 'west', 'up', 'down'];

/** Element coordinates must lie within -16..32 or Minecraft refuses to load the model. */
const COORD_MIN = -16;
const COORD_MAX = 32;

export function isOutOfBounds(coords: readonly unknown[]): boolean {
  return coords.some((v) => typeof v !== 'number' || v < COORD_MIN || v > COORD_MAX);
}

/** Rounds floating point numbers to avoid artifacts like 5.333333333333333. */
export function roundNumber(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}
