import { describe, expect, it } from 'vitest';
import { contentTypeFor, isValidBucketName, joinKey } from './keys';

describe('joinKey', () => {
  it('joins prefix and relative path', () => {
    expect(joinKey('packs/demo', 'assets/minecraft/models/a.json')).toBe('packs/demo/assets/minecraft/models/a.json');
    expect(joinKey('/packs/demo/', 'pack.mcmeta')).toBe('packs/demo/pack.mcmeta');
    expect(joinKey('', 'pack.mcmeta')).toBe('pack.mcmeta');
  });

  it.each(['../other/a.json', 'a/../../b', './a', '/etc/passwd', 'a\\b', 'C:/x', 'a//b', '', 'a/', 'a\0b'])(
    'rejects the path %j',
    (path) => {
      expect(() => joinKey('packs', path)).toThrow(expect.objectContaining({ code: 'invalidConfig' }));
    },
  );

  it('rejects prefixes that escape', () => {
    expect(() => joinKey('packs/../x', 'a')).toThrow(expect.objectContaining({ code: 'invalidConfig' }));
    expect(() => joinKey('packs\\x', 'a')).toThrow(expect.objectContaining({ code: 'invalidConfig' }));
  });
});

describe('isValidBucketName', () => {
  it.each(['my-bucket', 'abc', 'packs.example.com', 'a1-b2'])('accepts %s', (name) => {
    expect(isValidBucketName(name)).toBe(true);
  });

  it.each(['ab', 'My-Bucket', '-bucket', 'bucket-', 'a..b', 'a.-b', '192.168.0.1', 'a_b', 'x'.repeat(64)])('rejects %s', (name) => {
    expect(isValidBucketName(name)).toBe(false);
  });
});

describe('contentTypeFor', () => {
  it.each([
    ['assets/minecraft/textures/item/a.png', 'image/png'],
    ['a/b.json', 'application/json'],
    ['pack.mcmeta', 'application/json'],
    ['sounds/x.OGG', 'audio/ogg'],
    ['pack.zip', 'application/zip'],
    ['items.yml', 'application/yaml'],
    ['notes.txt', 'text/plain; charset=utf-8'],
    ['model.bbmodel', 'application/octet-stream'],
    ['.hidden', 'application/octet-stream'],
    ['dir.png/file', 'application/octet-stream'],
  ])('%s → %s', (path, type) => {
    expect(contentTypeFor(path)).toBe(type);
  });
});
