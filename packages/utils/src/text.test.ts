import { describe, expect, it } from 'vitest';
import { prettyNameFromFile, slugify, stripFormatting } from './text';

describe('text', () => {
  it('slugifies names into identifiers', () => {
    expect(slugify('<red>Größtes Schwert!')).toBe('groesstes_schwert');
    expect(slugify('***', 'folder')).toBe('folder');
    expect(stripFormatting('&a<bold>Hi</bold> ')).toBe('Hi');
    expect(prettyNameFromFile('ruby_sword-2.bbmodel')).toBe('Ruby Sword 2');
  });
});
