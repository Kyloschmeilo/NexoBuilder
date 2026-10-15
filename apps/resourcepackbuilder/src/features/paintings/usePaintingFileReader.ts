import { useTranslations } from 'next-intl';
import { createMediaFileReader } from '../media/mediaFileReader';
import { readPaintingFile } from './paintingFiles';

/** Reads dropped or picked PNG files as painting textures; other files are reported. */
export function usePaintingFileReader() {
  const t = useTranslations('media.paintings');
  return createMediaFileReader(readPaintingFile, (name) => t('notPng', { name }));
}
