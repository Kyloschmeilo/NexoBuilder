/**
 * The resource ids (`namespace:path`) the open project defines, for the resource-id picker: its items, the models and
 * textures the export writes for them, and its sounds. Paths follow the export layout (`@resourcepackbuilder/export`).
 */
import { modelPathFor } from '@resourcepackbuilder/export';
import type { Project } from '@resourcepackbuilder/core/project';
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import { slugify, stripFormatting, uniqueId } from '@resourcepackbuilder/utils';

/** The kinds of ids the picker lists, in display order. */
export const RESOURCE_GROUPS = ['items', 'models', 'textures', 'sounds'] as const;

export type ResourceGroup = (typeof RESOURCE_GROUPS)[number];

/** One id the picker offers. */
export interface ResourceId {
  group: ResourceGroup;
  /** The value written, e.g. "ruby:item/weapons/ruby_sword" */
  id: string;
  /** What the user knows the resource by (an item's or texture's name), when it differs from the id */
  label?: string;
}

/** Every resource id of `project`, grouped in {@link RESOURCE_GROUPS} order, each group sorted by id. */
export function projectResourceIds(project: Project): ResourceId[] {
  const ns = project.namespace;
  const byId = (a: ResourceId, b: ResourceId) => a.id.localeCompare(b.id);
  const items = Object.values(project.items);
  const itemIds = items.map((item): ResourceId => ({
    group: 'items',
    id: formatResourceLocation(ns, item.itemId),
    label: stripFormatting(item.displayName) || undefined,
  }));
  const models: ResourceId[] = [];
  const textures: ResourceId[] = [];
  for (const item of items) {
    if (!item.model) continue;
    const modelPath = modelPathFor(project, item);
    models.push({ group: 'models', id: formatResourceLocation(ns, modelPath) });
    // The same names the export gives the textures (writeModel): slugs, made unique per model
    const used = new Set<string>();
    for (const texture of item.model.textures) {
      const name = uniqueId(slugify(texture.name, 'texture'), used);
      used.add(name);
      textures.push({ group: 'textures', id: formatResourceLocation(ns, `${modelPath}/${name}`), label: texture.name });
    }
  }
  const sounds = project.sounds.map((sound): ResourceId => ({ group: 'sounds', id: formatResourceLocation(ns, sound.soundId) }));
  return [itemIds, models, textures, sounds].flatMap((group) => group.sort(byId));
}
