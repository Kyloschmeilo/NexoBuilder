/** Destructive actions on glyphs, sounds and paintings, with their questions. */
import { useTranslations } from 'next-intl';
import type { Glyph } from '@resourcepackbuilder/core/nexo/glyphs/model';
import type { Painting } from '@resourcepackbuilder/core/nexo/paintings/model';
import type { Sound } from '@resourcepackbuilder/core/nexo/sounds/model';
import { deleteGlyph, deletePainting, deleteSound } from '../../commands/media';
import { confirm } from '../../store/dialogs';

export function useMediaActions() {
  const t = useTranslations('media');
  const tCommon = useTranslations('common');
  const tLayout = useTranslations('layout');

  /** Asks before deleting; resolves with whether the user agreed. */
  const confirmDelete = (title: string, name: string) =>
    confirm({
      title,
      message: `${t('shared.deleteMessage', { name })}\n\n${tLayout('folder.undoHint')}`,
      confirmLabel: tCommon('delete'),
      destructive: true,
    });

  return {
    async removeGlyph(glyph: Glyph) {
      if (await confirmDelete(t('glyphs.deleteTitle'), glyph.glyphId)) deleteGlyph(glyph.id);
    },

    async removeSound(sound: Sound) {
      if (await confirmDelete(t('sounds.deleteTitle'), sound.soundId)) deleteSound(sound.id);
    },

    async removePainting(painting: Painting) {
      if (await confirmDelete(t('paintings.deleteTitle'), painting.paintingId)) deletePainting(painting.id);
    },
  };
}
