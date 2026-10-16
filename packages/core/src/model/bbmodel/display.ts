/** Display transforms (first person, GUI, …) of a Blockbench project. */
import { DISPLAY_SLOTS } from '../../minecraft/vanillaModels';
import { isPlainObject } from '../../object';
import { roundNumber } from '../geometry';
import type { JavaDisplayTransform } from '../types';

const VECTOR_KEYS = ['rotation', 'translation', 'scale', 'rotation_pivot', 'scale_pivot'] as const;

export function convertDisplay(display: unknown): Record<string, JavaDisplayTransform> | undefined {
  if (!isPlainObject(display)) return undefined;
  const result: Record<string, JavaDisplayTransform> = {};
  for (const slot of DISPLAY_SLOTS) {
    const value = display[slot];
    if (!isPlainObject(value)) continue;
    const out: JavaDisplayTransform = {};
    for (const key of VECTOR_KEYS) {
      const v = value[key];
      if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number')) {
        out[key] = v.map((n: number) => roundNumber(n));
      }
    }
    // Older .bbmodel files store "mirror" separately → convert to negative scale
    const mirror = value.mirror;
    if (Array.isArray(mirror) && mirror.some(Boolean)) {
      const scale = out.scale ?? [1, 1, 1];
      out.scale = scale.map((s, i) => (mirror[i] ? -Math.abs(s) : s));
    }
    if (Object.keys(out).length > 0) result[slot] = out;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
