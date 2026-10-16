/** Item config data: turning arbitrary values (e.g. from an editor) into config data, reading and writing nested values. */
import { getPath as getAnyPath, mapData, setPath as setAnyPath } from '@resourcepackbuilder/utils';
import type { ConfigObject, ConfigValue } from './types';

export { deletePath, hasPath } from '@resourcepackbuilder/utils';

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

export function getPath(obj: ConfigObject, path: string[]): ConfigValue | undefined {
  return getAnyPath(obj, path) as ConfigValue | undefined;
}

export function setPath(obj: ConfigObject, path: string[], value: ConfigValue | undefined): void {
  setAnyPath(obj, path, value);
}
