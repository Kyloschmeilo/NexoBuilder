/** Actions on glyphs, sounds and paintings that ask or report: deleting, and creating items for them. */
import { useTranslations } from 'next-intl';
import { musicDiscItem, paintingItem } from '@resourcepackbuilder/core/nexo/media/items';
import { mediaId, type MediaEntryByKind, type MediaKind } from '@resourcepackbuilder/core/nexo/media/kinds';
import type { Painting } from '@resourcepackbuilder/core/nexo/paintings/model';
import type { Sound } from '@resourcepackbuilder/core/nexo/sounds/model';
import { addMediaItem, MEDIA_COMMANDS } from '../../commands/media';
import { notify } from '../../shell/notify';
import { confirm } from '../../store/dialogs';
import { useOpenProject } from '../../store/project';

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
    /** Asks before deleting the entry. */
    async remove<K extends MediaKind>(kind: K, entry: MediaEntryByKind[K]) {
      const titleKey: (typeof DELETE_TITLE_KEYS)[MediaKind] = DELETE_TITLE_KEYS[kind];
      const confirmed = await confirm({
        title: t(titleKey),
        message: `${t('shared.deleteMessage', { name: mediaId(kind, entry) })}\n\n${tLayout('folder.undoHint')}`,
        confirmLabel: tCommon('delete'),
        destructive: true,
      });
      if (confirmed) MEDIA_COMMANDS[kind].remove(entry.id);
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
