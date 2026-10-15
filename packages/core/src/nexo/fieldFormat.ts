/** Validation of single text values against their field format (duration, vector, color …). */
import { RESOURCE_LOCATION_PATTERN } from '../minecraft/resourceLocation';
import type { TextField } from './fields';
import { MODEL_TOKEN } from './tokens';

const DURATION = /^\d+(\.\d+)?(t|ms|s|m|h|d|w|mo)?$/;
const VECTOR = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const COLOR = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;
const RANGE = /^-?\d+(\.\d+)?(\.\.-?\d+(\.\d+)?)?$/;

/**
 * Checks a text value against its format.
 * @returns null if valid, otherwise a message key in the `schema` namespace (`validation.*`)
 */
export function validateTextFormat(format: TextField['format'], value: string): string | null {
  if (!value || value === MODEL_TOKEN) return null;
  switch (format) {
    case 'duration':
      return DURATION.test(value.trim()) ? null : 'validation.duration';
    case 'vector':
      return VECTOR.test(value) ? null : 'validation.vector';
    case 'color': {
      const m = COLOR.exec(value);
      if (!m) return 'validation.color';
      return [m[1], m[2], m[3]].every((n) => Number(n) <= 255) ? null : 'validation.colorRange';
    }
    case 'range':
      return RANGE.test(value.trim()) ? null : 'validation.range';
    case 'resource':
      return RESOURCE_LOCATION_PATTERN.test(value.trim()) ? null : 'validation.resource';
    default:
      return null;
  }
}
