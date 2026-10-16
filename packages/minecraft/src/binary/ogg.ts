/** OGG detection. */
import { dataUrlHead } from './dataUrl';

/** Whether the data URL's content starts with the OGG capture pattern ("OggS"). */
export function isOggDataUrl(dataUrl: string): boolean {
  const head = dataUrlHead(dataUrl, 4);
  return !!head && String.fromCharCode(...head) === 'OggS';
}
