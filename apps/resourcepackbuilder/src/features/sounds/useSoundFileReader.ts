import { useTranslations } from 'next-intl';
import { createMediaFileReader } from '../media/mediaFileReader';
import { readSoundFile } from './soundFiles';

/** Reads dropped or picked OGG files; other files are reported. */
export function useSoundFileReader() {
  const t = useTranslations('media.sounds');
  return createMediaFileReader(readSoundFile, (name) => t('notOgg', { name }));
}
