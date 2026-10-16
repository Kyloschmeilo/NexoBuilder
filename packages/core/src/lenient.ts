/**
 * Lenient zod building blocks for stored and received data: a bad field falls back to its default, a bad list or
 * map entry is dropped – reading old or damaged data never fails because of a single value.
 */
import { z } from 'zod';

/** A string; anything else becomes `fallback`. */
export const lenientString = (fallback = '') => z.string().catch(fallback);

/** A finite number; anything else becomes `fallback`. */
export const lenientNumber = (fallback: number) => z.number().catch(fallback);

/** A boolean; anything else becomes `fallback`. */
export const lenientBoolean = (fallback: boolean) => z.boolean().catch(fallback);

/** A finite number or null; anything else becomes null. */
export const nullableNumber = () => z.number().nullable().catch(null);

/** One of `values`; anything else becomes `fallback`. */
export const lenientEnum = <const T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.enum(values).catch(fallback as never) as unknown as z.ZodType<T[number], unknown>;

/** A value that is left out when missing or invalid. */
export const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

/** A list whose entries that do not match `entry` are dropped (anything but a list fails). */
export function listOf<T extends z.ZodType>(entry: T): z.ZodType<z.output<T>[], unknown> {
  return z.array(z.unknown()).transform((list) =>
    list.flatMap((value) => {
      const parsed = entry.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    }),
  );
}

/** A list whose entries that do not match `entry` are dropped (no list at all becomes []). */
export const lenientList = <T extends z.ZodType>(entry: T) => listOf(entry).catch([]);

/** A string list; other entries are dropped. */
export const stringList = () => lenientList(z.string());

/** A plain object whose entries that do not match `entry` are dropped (anything but an object fails). */
export function recordOf<T extends z.ZodType>(entry: T): z.ZodType<Record<string, z.output<T>>, unknown> {
  return z.record(z.string(), z.unknown()).transform((record) => {
    const result: Record<string, z.output<T>> = {};
    for (const [key, value] of Object.entries(record)) {
      const parsed = entry.safeParse(value);
      if (parsed.success) result[key] = parsed.data;
    }
    return result;
  });
}

/** A plain object whose entries that do not match `entry` are dropped (no object at all becomes {}). */
export const lenientRecord = <T extends z.ZodType>(entry: T) => recordOf(entry).catch({});

/** A plain object with arbitrary values. */
export const plainObject = () => z.record(z.string(), z.unknown());

/** `true` when a schema's output is assignable to the type it stands for. */
export type Fits<Output, Type> = [Output] extends [Type] ? true : { error: 'schema output does not fit the type'; output: Output };
/** `true` when the schema knows every key of the type. */
export type Covers<Output, Type> = [Exclude<keyof Type, keyof Output>] extends [never]
  ? true
  : { error: 'schema misses keys'; keys: Exclude<keyof Type, keyof Output> };
/** Compiles only when every check is `true` (type-level schema/type compatibility). */
export type SchemaChecks<T extends true[]> = T;

/** Removes keys whose value is undefined (optional fields that were missing or invalid). */
export function withoutUndefined<T extends object>(value: T): T {
  for (const key of Object.keys(value) as Array<keyof T>) if (value[key] === undefined) delete value[key];
  return value;
}
