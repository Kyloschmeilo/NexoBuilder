import { describe, expect, it } from 'vitest';
import { makePngDataUrl } from '../test/png';
import { readGifInfoFromDataUrl } from './gif';
import { isOggDataUrl } from './ogg';
import { isPngDataUrl, readPngInfoFromDataUrl } from './png';

const dataUrl = (mime: string, bytes: number[]) => `data:${mime};base64,` + Buffer.from(bytes).toString('base64');

describe('file sniffing', () => {
  it('reads PNG and GIF sizes from their headers', () => {
    expect(readPngInfoFromDataUrl(makePngDataUrl(8, 4))).toEqual({ width: 8, height: 4 });
    expect(readGifInfoFromDataUrl(dataUrl('image/gif', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 9, 0, 11, 0]))).toEqual({
      width: 9,
      height: 11,
    });
    expect(readGifInfoFromDataUrl(dataUrl('image/gif', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))).toBeNull();
    expect(readGifInfoFromDataUrl(makePngDataUrl(8, 8))).toBeNull();
  });

  it('recognises OGG content and PNG data URLs', () => {
    expect(isOggDataUrl(dataUrl('audio/ogg', [0x4f, 0x67, 0x67, 0x53, 0]))).toBe(true);
    expect(isOggDataUrl(dataUrl('audio/ogg', [0x49, 0x44, 0x33, 0]))).toBe(false);
    expect(isPngDataUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isPngDataUrl('data:image/pngx;base64,AAAA')).toBe(false);
  });
});
