import { describe, expect, it } from 'vitest';
import { prettyNameFromFile, slugify, stripFormatting } from './text';

describe('text', () => {
  it('slugifies names into identifiers', () => {
    expect(slugify('<red>Größtes Schwert!')).toBe('groesstes_schwert');
    expect(slugify('***', 'folder')).toBe('folder');
    expect(stripFormatting('&a<bold>Hi</bold> ')).toBe('Hi');
    expect(stripFormatting('§cFish&Chips')).toBe('Fish&Chips');
    expect(stripFormatting('&x&f&f&0&0&0&0Gold &lBold §lA§rB')).toBe('Gold Bold AB');
    expect(prettyNameFromFile('ruby_sword-2.bbmodel')).toBe('Ruby Sword 2');
  });
});
