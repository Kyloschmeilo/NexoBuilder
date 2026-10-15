/** Helpers for reading/writing nested config values. */
import type { ConfigObject, ConfigValue } from '../types';
import { isPlainObject } from '../util';

export function getPath(obj: ConfigObject, path: string[]): ConfigValue | undefined {
  let current: unknown = obj;
  for (const key of path) {
    if (!isPlainObject(current)) return undefined;
    current = current[key];
  }
  return current as ConfigValue | undefined;
}

export function hasPath(obj: ConfigObject, path: string[]): boolean {
  return getPath(obj, path) !== undefined;
}

/** Sets a value (mutates `obj`). Missing intermediate objects are created. */
export function setPath(obj: ConfigObject, path: string[], value: ConfigValue | undefined): void {
  if (path.length === 0) return;
  let current: Record<string, unknown> = obj;
  for (const key of path.slice(0, -1)) {
    const next = current[key];
    if (!isPlainObject(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const last = path[path.length - 1];
  if (value === undefined) delete current[last];
  else current[last] = value;
}

/** Removes a value and cleans up parent objects that became empty (mutates `obj`). */
export function deletePath(obj: ConfigObject, path: string[]): void {
  if (path.length === 0) return;
  const parents: Array<Record<string, unknown>> = [];
  let current: unknown = obj;
  for (const key of path.slice(0, -1)) {
    if (!isPlainObject(current)) return;
    parents.push(current);
    current = current[key];
  }
  if (!isPlainObject(current)) return;
  delete current[path[path.length - 1]];
  // remove empty parents
  for (let i = path.length - 2; i >= 0; i--) {
    const parent = parents[i];
    const child = parent[path[i]];
    if (isPlainObject(child) && Object.keys(child).length === 0) delete parent[path[i]];
    else break;
  }
}
