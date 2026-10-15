/** Turning arbitrary values (e.g. from an editor) into item config data. */
import { isPlainObject } from '../object';
import type { ConfigValue } from './types';

/**
 * A value as config data (YAML scalars, lists and objects), or undefined for "not set". Object keys without a value
 * are dropped, list entries without one become null; anything that is not config data (functions, NaN…) counts as
 * "not set".
 */
export function toConfigValue(value: unknown): ConfigValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) return value.map((entry) => toConfigValue(entry) ?? null);
  if (!isPlainObject(value)) return undefined;
  const result: Record<string, ConfigValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    const converted = toConfigValue(entry);
    if (converted !== undefined) result[key] = converted;
  }
  return result;
}
