/** Internal IDs and user-facing IDs of project entries. */
import { itemIdSyntaxError } from '../minecraft/resourceLocation';
import { slugify } from '../text';
import type { Item, Project } from './types';

/** Random internal ID, e.g. uid('i_') → "i_3f9a0c1b2d4e" */
export function uid(prefix = ''): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix + random;
}

/** `base` if it is free, otherwise the first free `base_2`, `base_3` … */
export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** Suggests a unique item ID, e.g. "ruby_sword_2" if "ruby_sword" already exists. */
export function uniqueNexoId(project: Project, wanted: string, ignoreItemId?: string): string {
  const taken = new Set(
    Object.values(project.items)
      .filter((i) => i.id !== ignoreItemId)
      .map((i) => i.nexoId),
  );
  return uniqueId(slugify(wanted, 'item'), taken);
}

export type ItemIdError = { kind: 'missing' } | { kind: 'invalid' } | { kind: 'duplicate'; other: Item };

/** Checks a Nexo item ID: present, valid characters and not used by another item of the project. */
export function validateItemId(project: Project, nexoId: string, ignoreItemId?: string): ItemIdError | null {
  const syntax = itemIdSyntaxError(nexoId);
  if (syntax) return { kind: syntax };
  const other = Object.values(project.items).find((i) => i.id !== ignoreItemId && i.nexoId === nexoId);
  return other ? { kind: 'duplicate', other } : null;
}
