/** User-facing IDs of project entries. */
import { slugify, uniqueId } from '@resourcepackbuilder/utils';
import { itemIdSyntaxError } from '../minecraft/resourceLocation';
import type { Item, Project } from './types';

/** Suggests a unique item ID, e.g. "ruby_sword_2" if "ruby_sword" already exists. */
export function uniqueNexoId(project: Project, wanted: string, ignoreItemId?: string): string {
  const taken = new Set(
    Object.values(project.items)
      .filter((i) => i.id !== ignoreItemId)
      .map((i) => i.nexoId),
  );
  return uniqueId(slugify(wanted, 'item'), taken);
}

/** `duplicate`: another item of the project has the ID; `repeated`: several of the new items share it. */
export type ItemIdError = { kind: 'missing' } | { kind: 'invalid' } | { kind: 'duplicate'; other: Item } | { kind: 'repeated' };

/** Checks a Nexo item ID: present, valid characters and not used by another item of the project. */
export function validateItemId(project: Project, nexoId: string, ignoreItemId?: string): ItemIdError | null {
  const syntax = itemIdSyntaxError(nexoId);
  if (syntax) return { kind: syntax };
  const other = Object.values(project.items).find((i) => i.id !== ignoreItemId && i.nexoId === nexoId);
  return other ? { kind: 'duplicate', other } : null;
}

/** Checks the IDs of several new items: each against the project (see validateItemId) and against the others. */
export function validateNewItemIds(project: Project, nexoIds: readonly string[]): Array<ItemIdError | null> {
  const counts = new Map<string, number>();
  for (const id of nexoIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return nexoIds.map((id) => validateItemId(project, id) ?? ((counts.get(id) ?? 0) > 1 ? { kind: 'repeated' } : null));
}
