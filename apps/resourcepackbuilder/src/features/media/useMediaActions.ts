/** Actions on glyphs, sounds and paintings that ask or report: deleting, and creating items for them. */
import { useTranslations } from 'next-intl';
import {
  type MediaEntryByKind,
  mediaId,
  type MediaKind,
  musicDiscItem,
  type Painting,
  paintingItem,
  type Sound,
} from '@resourcepackbuilder/core/project';
import { addMediaItem, MEDIA_COMMANDS } from '../../commands/media';
import { notify } from '../../shell/notify';
import { confirm } from '../../store/dialogs';
import { useOpenProject } from '../../store/project';
import { selectEntry } from '../../store/ui';
import { MEDIA_KIND_INFO } from './mediaKinds';

const DELETE_TITLE_KEYS = {
  glyph: 'glyphs.deleteTitle',
  sound: 'sounds.deleteTitle',
  painting: 'paintings.deleteTitle',
} as const satisfies Record<MediaKind, string>;

export function useMediaActions() {
  const t = useTranslations('media');
  const tApp = useTranslations('app');
  const tCommon = useTranslations('common');
  const tLayout = useTranslations('layout');
  const project = useOpenProject();

  return {
    /** Asks before deleting the entry; then shows the overview of its kind. */
    async remove<K extends MediaKind>(kind: K, entry: MediaEntryByKind[K]) {
      const titleKey: (typeof DELETE_TITLE_KEYS)[MediaKind] = DELETE_TITLE_KEYS[kind];
      const confirmed = await confirm({
        title: t(titleKey),
        message: `${t('shared.deleteMessage', { name: mediaId(kind, entry) })}\n\n${tLayout('folder.undoHint')}`,
        confirmLabel: tCommon('delete'),
        destructive: true,
      });
      if (!confirmed) return;
      MEDIA_COMMANDS[kind].remove(entry.id);
      // The page of the deleted entry falls back to its overview
      selectEntry(MEDIA_KIND_INFO[kind].view);
    },

    /** Creates an item that hangs the painting, selects it and reports it. */
    createPaintingItem(painting: Painting) {
      if (addMediaItem(paintingItem(project, painting), tApp('defaults.paintingsFolder'))) notify('success', t('paintings.itemCreated'));
    },

    /** Creates a music disc that plays the sound, selects it and reports it. */
    createMusicDisc(sound: Sound) {
      if (addMediaItem(musicDiscItem(project, sound), tApp('defaults.musicFolder'))) notify('success', t('sounds.discCreated'));
    },
  };
}
