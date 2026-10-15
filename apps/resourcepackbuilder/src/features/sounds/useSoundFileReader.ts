import { useTranslations } from 'next-intl';
import { mediaFileReader } from '../media/mediaFileReader';
import { readSoundFile } from './soundFiles';

/** Reads dropped or picked OGG files; other files are reported. */
export function useSoundFileReader() {
  const t = useTranslations('media.sounds');
  return mediaFileReader(readSoundFile, (name) => t('notOgg', { name }));
}
