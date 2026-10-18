/**
 * The media kinds as registries. Glyphs, sounds and paintings start from uploaded files (one descriptor per kind with
 * its view, icon and how a file becomes an entry); a Nexo project's dialogs start from a template. The Media panel
 * lists their entries; another media kind only needs its own {@link Registry} in {@link MEDIA_REGISTRIES}.
 */
import { Frame, type LucideIcon, Music, Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/export';
import {
  glyphKindOf,
  type MediaEntryByKind,
  type MediaKind,
  mediaId,
  mediaList,
  type Project,
  type UploadMediaKind,
} from '@resourcepackbuilder/core/project';
import { pickFiles } from '@resourcepackbuilder/ui';
import { addDialog, addGlyph, addPainting, addSound } from '../../commands/media';
import { useMediaFileReader } from '../../hooks/useFileReaders';
import { MEDIA_FILES, type MediaFileByKind } from '../../lib/mediaFiles';
import type { Registry, RegistryEntry, RegistryTable } from '../../shell/sidebar/panels/registry';
import { levelsByTarget } from '../../shell/sidebar/treeIndex';

/** The view of each media kind. */
export const MEDIA_KIND_VIEWS = {
  glyph: 'glyphs',
  sound: 'sounds',
  painting: 'paintings',
  dialog: 'dialogs',
} as const satisfies Record<MediaKind, string>;

/** What the pages and the panel know about one media kind that starts from uploaded files. */
export interface MediaKindInfo<K extends UploadMediaKind> {
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

export const MEDIA_KIND_INFO: { [K in UploadMediaKind]: MediaKindInfo<K> } = {
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

/** The fact and image the panel shows for an entry of `kind` (a dialog: its type). */
function entryFacts<K extends MediaKind>(kind: K, entry: MediaEntryByKind[K]): { detail?: string; thumb?: string } {
  if (kind === 'dialog') {
    const { type } = (entry as MediaEntryByKind['dialog']).config;
    return { detail: typeof type === 'string' ? type : undefined };
  }
  const info = MEDIA_KIND_INFO[kind as UploadMediaKind] as MediaKindInfo<UploadMediaKind>;
  const upload = entry as MediaEntryByKind[UploadMediaKind];
  return { detail: info.detail(upload), thumb: info.thumb(upload) };
}

/** The panel entries of a media kind: id, size or type, thumbnail and the worst issue level of each. */
export function mediaEntries<K extends MediaKind>(kind: K, project: Project, plan: ExportPlan | null): RegistryEntry[] {
  const levels = plan ? levelsByTarget(plan.issues, kind) : null;
  return mediaList(project, kind).map((entry) => ({
    key: entry.id,
    label: mediaId(kind, entry),
    ...entryFacts(kind, entry),
    level: levels?.get(entry.id) ?? null,
  }));
}

/** Creates entries of `kind` from files (the picker or a drop); returns the internal id of the first one. */
export function useAddMediaFiles<K extends UploadMediaKind>(kind: K): (files: File[]) => Promise<string | null> {
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

function mediaRegistry<K extends UploadMediaKind>(kind: K): Registry {
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

/** A Nexo project's dialogs: a new one starts as a notice with one button. */
const dialogRegistry: Registry = {
  view: 'dialogs',
  groups: (project, plan) => [{ id: 'dialogs', entries: mediaEntries('dialog', project, plan) }],
  useAdd() {
    const t = useTranslations('media.dialogs');
    return { add: () => Promise.resolve(addDialog(t('defaultId'))) };
  },
};

/** The registries of the Media panel (the multipack page has no entries and stays a page link). */
export const MEDIA_REGISTRIES: RegistryTable = {
  glyphs: mediaRegistry('glyph'),
  sounds: mediaRegistry('sound'),
  paintings: mediaRegistry('painting'),
  dialogs: dialogRegistry,
};
