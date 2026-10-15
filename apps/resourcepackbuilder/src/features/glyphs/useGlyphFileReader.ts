import { useTranslations } from 'next-intl';
import { mediaFileReader } from '../media/mediaFileReader';
import { readGlyphFile } from './glyphFiles';

/** Reads dropped or picked PNG/GIF files as glyph images; other files are reported. */
export function useGlyphFileReader() {
  const t = useTranslations('media.glyphs');
  return mediaFileReader(readGlyphFile, (name) => t('notImage', { name }));
}
