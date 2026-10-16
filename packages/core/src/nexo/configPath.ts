/**
 * Reading/writing nested item config values – typed for config data. The generic helpers live in
 * ../object; this module stays because the app imports it.
 */
import * as object from '../object';
import type { ConfigObject, ConfigValue } from '../project/types';

export function getPath(obj: ConfigObject, path: string[]): ConfigValue | undefined {
  return object.getPath(obj, path) as ConfigValue | undefined;
}

export function setPath(obj: ConfigObject, path: string[], value: ConfigValue | undefined): void {
  object.setPath(obj, path, value);
}

export { deletePath, hasPath } from '../object';
