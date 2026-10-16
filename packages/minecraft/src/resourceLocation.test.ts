import { describe, expect, it } from 'vitest';
import {
  formatResourceLocation,
  isVanillaReference,
  itemIdSyntaxError,
  namespaceError,
  parseResourceLocation,
  resourceBaseName,
  stripMinecraftNamespace,
} from './resourceLocation';

describe('identifiers', () => {
  it('classifies namespaces and item IDs', () => {
    expect(namespaceError('mein-pack')).toBeNull();
    expect(namespaceError('Mein Pack')).toBe('invalid');
    expect(namespaceError('minecraft')).toBe('minecraft');
    expect(namespaceError('nexo')).toBe('nexo');
    expect(itemIdSyntaxError('')).toBe('missing');
    expect(itemIdSyntaxError('Ruby')).toBe('invalid');
    expect(itemIdSyntaxError('ruby_2')).toBeNull();
  });
});

describe('resource locations', () => {
  it('parses and formats namespace:path', () => {
    expect(parseResourceLocation('ruby:item/sword')).toEqual({ namespace: 'ruby', path: 'item/sword' });
    expect(parseResourceLocation('block/stone')).toEqual({ namespace: 'minecraft', path: 'block/stone' });
    expect(formatResourceLocation('ruby', 'item/sword')).toBe('ruby:item/sword');
  });

  it('recognises vanilla references and strips their namespace', () => {
    expect(isVanillaReference('block/stone')).toBe(true);
    expect(isVanillaReference('minecraft:block/stone')).toBe(true);
    expect(isVanillaReference('ruby:block/stone')).toBe(false);
    expect(stripMinecraftNamespace('minecraft:item/generated')).toBe('item/generated');
    expect(stripMinecraftNamespace('ruby:item/generated')).toBe('ruby:item/generated');
  });

  it('returns the last path segment', () => {
    expect(resourceBaseName('minecraft:item/ruby_sword')).toBe('ruby_sword');
    expect(resourceBaseName('ruby:sword')).toBe('sword');
    expect(resourceBaseName('sword')).toBe('sword');
  });
});
