/** Drops the empty values of an item config before it is written: by the property's field, or generically. */
import { isPlainObject, mapData } from '@resourcepackbuilder/utils';
import type { ConfigObject, ConfigValue } from '../project/types';
import { getPath, setPath } from '../project/config';
import { type Field, findChoice, findTypedType } from './fields';
import { BooleanValue, NumberValue } from './fieldSchema';
import { unknownConfigPaths } from './properties';
import type { FormSchema } from './types';

/**
 * The config's values cleaned up according to `schema`: each property is pruned by its field, values that belong to
 * no property are taken over (only empty ones are dropped).
 */
export function cleanConfig(schema: FormSchema, source: ConfigObject): ConfigObject {
  const cleaned: ConfigObject = {};
  for (const def of schema.properties) {
    if (def.storage !== 'config') continue;
    const value = getPath(source, def.path);
    if (value === undefined) continue;
    let pruned = pruneByField(value, def.field);
    if (pruned === undefined && def.keepEmpty && isPlainObject(value)) pruned = {};
    if (pruned !== undefined) setPath(cleaned, def.path, pruned as ConfigValue);
  }
  for (const path of unknownConfigPaths(schema, source)) {
    const pruned = pruneGeneric(getPath(source, path));
    if (pruned !== undefined) setPath(cleaned, path, pruned as ConfigValue);
  }
  return cleaned;
}

/** A value without its empty parts, by its field (as the export writes it); undefined if nothing is left. */
export function pruneValue(value: unknown, field: Field): unknown {
  return pruneByField(value, field);
}

function isEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.trim() === '';
}

/** Removes empty values according to the field description. Returns undefined if nothing is left. */
function pruneByField(value: unknown, field: Field): unknown {
  if (value === undefined || value === null) return undefined;
  switch (field.type) {
    case 'text':
      if (typeof value === 'string') return isEmptyString(value) ? undefined : value;
      return pruneGeneric(value);
    // Numbers and booleans stored as text are converted; anything else is left out (and reported, see fieldSchema)
    case 'number':
      return NumberValue.safeParse(value).data;
    case 'boolean':
      return BooleanValue.safeParse(value).data;
    case 'select':
      return typeof value === 'string' && isEmptyString(value) ? undefined : value;
    case 'stringList': {
      const list = Array.isArray(value) ? value : [value];
      const strings = list.filter((v) => v !== undefined && v !== null).map((v) => (typeof v === 'string' ? v : String(v)));
      if (strings.every((s) => isEmptyString(s))) return undefined;
      const keepBlankLines = field.format === 'minimessage';
      const cleaned = keepBlankLines ? trimTrailingEmpty(strings) : strings.filter((s) => !isEmptyString(s));
      if (field.singleAsString && cleaned.length === 1) return cleaned[0];
      return cleaned;
    }
    case 'multiSelect': {
      const list = Array.isArray(value) ? value.filter((v) => typeof v === 'string' && v) : [];
      return list.length > 0 ? list : undefined;
    }
    case 'presence':
      return isPlainObject(value) || value === true ? {} : undefined;
    case 'yaml':
      return value;
    case 'texture':
      return typeof value === 'string' && value ? value : undefined;
    case 'object': {
      if (value === true && field.emptyValue === true) return true;
      if (!isPlainObject(value)) return undefined;
      const out: Record<string, unknown> = {};
      const known = new Set(field.fields.map((f) => f.key));
      for (const child of field.fields) {
        if (child.key === '*') {
          // "all remaining keys" (e.g. effects in armor_effects)
          const rest: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(value)) if (!known.has(k)) rest[k] = v;
          const prunedRest = pruneByField(rest, child);
          if (isPlainObject(prunedRest)) Object.assign(out, prunedRest);
          continue;
        }
        const pruned = pruneByField(value[child.key], child);
        if (pruned !== undefined) out[child.key] = pruned;
      }
      for (const [k, v] of Object.entries(value)) {
        if (known.has(k) || known.has('*')) continue;
        const pruned = pruneGeneric(v);
        if (pruned !== undefined) out[k] = pruned;
      }
      if (Object.keys(out).length === 0) return field.emptyValue === true ? true : undefined;
      return out;
    }
    case 'objectList': {
      if (!Array.isArray(value)) return undefined;
      const objectField: Field = { type: 'object', key: '', label: '', fields: field.fields };
      const list = value.map((v) => pruneByField(v, objectField)).filter((v) => v !== undefined);
      return list.length > 0 ? list : undefined;
    }
    case 'typedList': {
      // A single entry without a list stays single
      if (isPlainObject(value)) return pruneTypedEntry(value, field);
      if (!Array.isArray(value)) return undefined;
      const list = value.map((entry) => pruneTypedEntry(entry, field)).filter((v) => v !== undefined);
      return list.length > 0 ? list : undefined;
    }
    case 'numberProvider':
      if (typeof value === 'string') return isEmptyString(value) ? undefined : (NumberValue.safeParse(value).data ?? value);
      return isPlainObject(value) ? pruneTypedEntry(value, field) : value;
    case 'choice': {
      const choice = findChoice(field, value);
      return choice ? pruneByField(value, choice.field) : pruneGeneric(value);
    }
    case 'map': {
      if (!isPlainObject(value)) return undefined;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        if (!k.trim() || field.reservedKeys?.includes(k)) continue;
        let pruned = pruneByField(v, field.value);
        // An effect without further details is still intended → keep the empty object
        if (pruned === undefined && isPlainObject(v)) pruned = {};
        if (pruned !== undefined) out[k] = pruned;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    }
  }
}

/**
 * An entry of a known type is pruned by that type's fields (its `type` is kept, first); an empty object (an entry
 * whose type was never chosen) is dropped; any other value stays unchanged.
 */
function pruneTypedEntry(entry: unknown, field: Parameters<typeof findTypedType>[0]): unknown {
  const type = findTypedType(field, entry);
  if (!type) return entry === null || (isPlainObject(entry) && Object.keys(entry).length === 0) ? undefined : entry;
  const pruned = pruneByField(entry, { type: 'object', key: '', label: '', fields: type.fields });
  // `type` leads the entry, as in the plugins' docs
  return isPlainObject(pruned) ? { type: (entry as Record<string, unknown>).type, ...pruned } : pruned;
}

function trimTrailingEmpty(list: string[]): string[] {
  const out = [...list];
  while (out.length > 0 && isEmptyString(out[out.length - 1])) out.pop();
  return out;
}

/** Pruning for values without a schema: remove empty strings/lists/objects. */
function pruneGeneric(value: unknown): unknown {
  return mapData(value, pruneScalar, { dropEmpty: true });
}

function pruneScalar(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return isEmptyString(value) ? undefined : value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  return value;
}
