/** User-facing IDs of project entries (the generic uid/uniqueId live in ../id and are re-exported for the app). */
import { uniqueId } from '../id';
import { itemIdSyntaxError } from '../minecraft/resourceLocation';
import { slugify } from '../text';
import type { Item, Project } from './types';

export { uid, uniqueId } from '../id';

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
