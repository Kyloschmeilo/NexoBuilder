import { describe, expect, it } from 'vitest';
import { createDesktopTranslators, DESKTOP_MESSAGES_BY_LOCALE } from './desktop';
import { messageParityErrors } from './parity';

describe('the desktop catalogue', () => {
  it('is in parity between English and German', () => {
    expect(messageParityErrors(DESKTOP_MESSAGES_BY_LOCALE.en, DESKTOP_MESSAGES_BY_LOCALE.de)).toEqual([]);
  });

  it('fills placeholders', () => {
    const { t, tError } = createDesktopTranslators('en');
    expect(t('menu.about', { app: 'X' })).toBe('About X');
    expect(t('testServer.experimentalBuild', { version: '1.21', build: 3 })).toBe('Note: Paper 1.21 only has an experimental build (#3).');
    expect(tError('invalidFile', { file: 'a.txt' })).toBe('Invalid file: a.txt');
    expect(createDesktopTranslators('de').t('menu.file')).toBe('Datei');
  });
});
