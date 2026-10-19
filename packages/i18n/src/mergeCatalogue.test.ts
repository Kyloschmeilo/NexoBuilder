import { describe, expect, it } from 'vitest';
import { loadCatalogue } from '@resourcepackbuilder/test-utils/catalogue';
import { mergeCatalogue } from './mergeCatalogue';
import { MESSAGES_BY_LOCALE } from './messages';

describe('mergeCatalogue', () => {
  it('merges objects deeply without touching the fragments', () => {
    const a = { properties: { one: { label: 'One' } }, groups: { a: 'A' } };
    const b = { properties: { two: { label: 'Two' } } };
    expect(mergeCatalogue(a, b)).toEqual({ properties: { one: { label: 'One' }, two: { label: 'Two' } }, groups: { a: 'A' } });
    expect(a.properties).toEqual({ one: { label: 'One' } });
  });

  it('rejects a key that two fragments both define', () => {
    expect(() => mergeCatalogue({ properties: { one: { label: 'One' } } }, { properties: { one: { label: 'Uno' } } })).toThrow(
      'properties.one.label',
    );
  });
});

describe('the split namespaces', () => {
  // A fragment file that is missing from the import list of its `index.ts` would be loaded from disk by the other tests
  // but never shipped: compare the shipped catalogue with every file on disk.
  for (const locale of ['en', 'de'] as const) {
    for (const namespace of ['schema', 'ceSchema'] as const) {
      it(`ships every ${namespace} file of the ${locale} catalogue`, () => {
        expect(MESSAGES_BY_LOCALE[locale][namespace]).toEqual(loadCatalogue(locale, namespace));
      });
    }
  }
});
