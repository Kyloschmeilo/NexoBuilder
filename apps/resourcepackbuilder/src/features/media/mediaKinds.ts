/**
 * The media kinds (glyphs, sounds, paintings) as registries: one descriptor per kind with its view, icon, message
 * section and how an uploaded file becomes an entry. The Media panel lists their entries; another media kind (with
 * its own data and pages) only needs its own {@link Registry} in {@link MEDIA_REGISTRIES}.
 */
import { Frame, type LucideIcon, Music, Smile } from 'lucide-react';
import type { ExportPlan } from '@resourcepackbuilder/export';
import { glyphKindOf, type MediaEntryByKind, type MediaKind, mediaId, mediaList, type Project } from '@resourcepackbuilder/core/project';
import { pickFiles } from '@resourcepackbuilder/ui';
import { addGlyph, addPainting, addSound } from '../../commands/media';
import { useMediaFileReader } from '../../hooks/useFileReaders';
import { MEDIA_FILES, type MediaFileByKind } from '../../lib/mediaFiles';
import type { Registry, RegistryEntry, RegistryTable } from '../../shell/sidebar/panels/registry';
import { levelsByTarget } from '../../shell/sidebar/treeIndex';

/** What the pages and the panel know about one media kind. */
export interface MediaKindInfo<K extends MediaKind> {
  kind: K;
  view: 'glyphs' | 'sounds' | 'paintings';
  icon: LucideIcon;
  /** Adds an entry for an uploaded file named `name`; returns its internal id */
  add: (name: string, file: MediaFileByKind[K]) => string | null;
  /** A short fact the panel shows on the right of an entry */
  detail: (entry: MediaEntryByKind[K]) => string | undefined;
  /** The image the panel shows in front of an entry */
  thumb: (entry: MediaEntryByKind[K]) => string | undefined;
}

export const MEDIA_KIND_INFO: { [K in MediaKind]: MediaKindInfo<K> } = {
  glyph: {
    kind: 'glyph',
    view: 'glyphs',
    icon: Smile,
    add: (name, file) => addGlyph(name, file, glyphKindOf(file)),
    detail: (glyph) =>
      glyph.kind === 'reference' ? `→ ${glyph.reference}` : glyph.file ? `${glyph.file.width}×${glyph.file.height}` : undefined,
    thumb: (glyph) => glyph.file?.dataUrl,
  },
  sound: {
    kind: 'sound',
    view: 'sounds',
    icon: Music,
    add: (name, file) => addSound(name, [file]),
    detail: (sound) => (sound.files.length > 1 ? `×${sound.files.length}` : undefined),
    thumb: () => undefined,
  },
  painting: {
    kind: 'painting',
    view: 'paintings',
    icon: Frame,
    add: addPainting,
    detail: (painting) => `${painting.width}×${painting.height}`,
    thumb: (painting) => painting.file?.dataUrl,
  },
};

/** The panel entries of a media kind: id, size, thumbnail and the worst issue level of each. */
export function mediaEntries<K extends MediaKind>(kind: K, project: Project, plan: ExportPlan | null): RegistryEntry[] {
  const info = MEDIA_KIND_INFO[kind] as MediaKindInfo<K>;
  const levels = plan ? levelsByTarget(plan.issues, kind) : null;
  return mediaList(project, kind).map((entry) => ({
    key: entry.id,
    label: mediaId(kind, entry),
    detail: info.detail(entry),
    thumb: info.thumb(entry),
    level: levels?.get(entry.id) ?? null,
  }));
}

/** Creates entries of `kind` from files (the picker or a drop); returns the internal id of the first one. */
export function useAddMediaFiles<K extends MediaKind>(kind: K): (files: File[]) => Promise<string | null> {
  const readFiles = useMediaFileReader(kind);
  return async (files) => {
    const info = MEDIA_KIND_INFO[kind] as MediaKindInfo<K>;
    let first: string | null = null;
    for (const entry of await readFiles(files)) {
      const id = info.add(entry.name, entry.file);
      first ??= id;
    }
    return first;
  };
}

function mediaRegistry<K extends MediaKind>(kind: K): Registry {
  const info = MEDIA_KIND_INFO[kind];
  return {
    view: info.view,
    groups: (project, plan) => [{ id: info.view, entries: mediaEntries(kind, project, plan) }],
    useAdd() {
      const addFiles = useAddMediaFiles(kind);
      const { accept } = MEDIA_FILES[kind];
      return {
        accept,
        addFiles,
        add: async () => addFiles(await pickFiles(accept, true)),
      };
    },
  };
}

/** The registries of the Media panel. */
export const MEDIA_REGISTRIES: RegistryTable = {
  glyphs: mediaRegistry('glyph'),
  sounds: mediaRegistry('sound'),
  paintings: mediaRegistry('painting'),
};
