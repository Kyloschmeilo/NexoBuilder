import { describe, expect, it } from 'vitest';
import { messagesByLocale } from './messages';
import { messageParityErrors } from './parity';

describe('the message catalogue', () => {
  it('is in parity between English and German', () => {
    expect(messageParityErrors(messagesByLocale.en, messagesByLocale.de)).toEqual([]);
  });

  it('names every language by its native name in each catalogue', () => {
    const expectedNames = { en: 'English', de: 'Deutsch' };
    expect(messagesByLocale.en.common.languageNames).toEqual(expectedNames);
    expect(messagesByLocale.de.common.languageNames).toEqual(expectedNames);
  });
});
