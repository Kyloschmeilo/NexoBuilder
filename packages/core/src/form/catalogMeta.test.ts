import { describe, expect, it } from 'vitest';
import { field, properties } from './build';
import { catalogTable, withCatalog } from './catalogMeta';

describe('withCatalog', () => {
  const defs = properties('demo', {
    a: { field: field.text(), defaultValue: () => '' },
    b: { field: field.text(), defaultValue: () => '', category: 'own', aliases: ['mine'] },
    c: { field: field.text(), defaultValue: () => '' },
  });
  const table = catalogTable({ first: ['a', 'b'] }, ['a'], { a: ['alpha'], b: ['beta'] });

  it('adds category, common and aliases from the table', () => {
    const [a] = withCatalog(defs, table);
    expect(a).toMatchObject({ id: 'a', category: 'first', common: true, aliases: ['alpha'] });
  });

  it('keeps what a property sets itself and leaves properties without an entry alone', () => {
    const [, b, c] = withCatalog(defs, table);
    expect(b).toMatchObject({ category: 'own', aliases: ['mine'] });
    expect(b).not.toHaveProperty('common');
    expect(c).toBe(defs[2]);
  });
});
