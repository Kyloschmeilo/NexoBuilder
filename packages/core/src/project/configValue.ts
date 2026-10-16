/** Turning arbitrary values (e.g. from an editor) into item config data. */
import { mapData } from '../object';
import type { ConfigValue } from './types';

/**
 * A value as config data (YAML scalars, lists and objects), or undefined for "not set". Object keys without a value
 * are dropped, list entries without one become null; anything that is not config data (functions, NaN…) counts as
 * "not set".
 */
export function toConfigValue(value: unknown): ConfigValue | undefined {
  return mapData(value, configScalar, { listHole: null }) as ConfigValue | undefined;
}

function configScalar(value: unknown): ConfigValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
