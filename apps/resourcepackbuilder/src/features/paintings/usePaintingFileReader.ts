import { useTranslations } from 'next-intl';
import { mediaFileReader } from '../media/mediaFileReader';
import { readPaintingFile } from './paintingFiles';

/** Reads dropped or picked PNG files as painting textures; other files are reported. */
export function usePaintingFileReader() {
  const t = useTranslations('media.paintings');
  return mediaFileReader(readPaintingFile, (name) => t('notPng', { name }));
}
