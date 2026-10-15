import { useTranslations } from 'next-intl';
import { readPngInfoFromDataUrl } from '@resourcepackbuilder/core/binary/png';
import { readPngAsDataUrl } from '@resourcepackbuilder/ui';
import { notify } from '../../shell/notify';

/** Files the PNG pickers offer. */
export const PNG_ACCEPT = '.png,image/png';

export interface PngFile {
  dataUrl: string;
  width: number;
  height: number;
}

/** Returns a reader for PNG files that reports files which are not a valid PNG (and returns null for them). */
export function usePngReader(): (file: File) => Promise<PngFile | null> {
  const t = useTranslations('item');
  return async (file) => {
    const dataUrl = await readPngAsDataUrl(file);
    const info = readPngInfoFromDataUrl(dataUrl);
    if (!info) {
      notify('error', t('editor.invalidPng'));
      return null;
    }
    return { dataUrl, width: info.width, height: info.height };
  };
}
