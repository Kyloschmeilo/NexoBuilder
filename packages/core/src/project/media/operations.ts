/**
 * Adding, finding and deleting glyphs, sounds and paintings. All functions mutate the project (for Immer
 * drafts or tests) and work the same for every kind (see MEDIA_KINDS).
 */
import { uid, uniqueId } from '@resourcepackbuilder/utils';
import { MEDIA_KINDS, mediaId, mediaList, setMediaList, type MediaEntryByKind, type MediaKind, type MediaLists } from './kinds';

/**
 * Adds an entry of `kind` whose user-facing ID is derived from `name` and unique within the list.
 * `create` builds the entry from the new internal ID and that user-facing ID.
 */
export function addMediaEntry<K extends MediaKind>(
  project: MediaLists,
  kind: K,
  name: string,
  create: (id: string, mediaId: string) => MediaEntryByKind[K],
): MediaEntryByKind[K] {
  const info = MEDIA_KINDS[kind];
  const list = mediaList(project, kind);
  const taken = new Set(list.map((entry) => mediaId(kind, entry)));
  const entry = create(uid(info.uidPrefix), uniqueId(info.idFromName(name), taken));
  list.push(entry);
  return entry;
}

/** The entry of `kind` with the internal ID `id`. */
export function findMediaEntry<K extends MediaKind>(project: MediaLists, kind: K, id: string): MediaEntryByKind[K] | undefined {
  return mediaList(project, kind).find((entry) => entry.id === id);
}

export function deleteMediaEntry(project: MediaLists, kind: MediaKind, id: string): void {
  setMediaList(
    project,
    kind,
    mediaList(project, kind).filter((entry) => entry.id !== id),
  );
}
