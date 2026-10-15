import { describe, expect, expectTypeOf, it } from 'vitest';
import { messagesByLocale, type MessageKey, type SchemaKey } from './messages';
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

  it('types message keys as dotted leaf paths', () => {
    expectTypeOf<'languageNames.en'>().toExtend<MessageKey<'common'>>();
    expectTypeOf<'languageNames'>().not.toExtend<MessageKey<'common'>>();
    expectTypeOf<'validation.duration'>().toExtend<SchemaKey>();
    expectTypeOf<'no.such.key'>().not.toExtend<SchemaKey>();
    expectTypeOf<SchemaKey>().not.toBeNever();
  });
});
