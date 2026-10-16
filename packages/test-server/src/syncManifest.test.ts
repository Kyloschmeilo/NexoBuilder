import { describe, expect, it } from 'vitest';
import { serverAdapterFor } from './adapter';
import { parseSyncManifest, staleSyncFiles } from './syncManifest';
import { isSafeSegment } from './syncPaths';

const ce = serverAdapterFor('craftengine');
const nexo = serverAdapterFor('nexo');

describe('parseSyncManifest', () => {
  it('reads the current shape and the older bare file list', () => {
    expect(parseSyncManifest({ packName: 'p', files: { 'a/b': 'h' } })).toEqual({ packName: 'p', files: { 'a/b': 'h' } });
    expect(parseSyncManifest({ 'items/a.yml': 'h' })).toEqual({ packName: null, files: { 'items/a.yml': 'h' } });
  });

  it('rejects anything else', () => {
    for (const data of [null, 'x', [], { packName: 1, files: {} }, { packName: 'p', files: { a: 1 } }]) {
      expect(parseSyncManifest(data), JSON.stringify(data)).toBeNull();
    }
  });
});

describe('staleSyncFiles', () => {
  it('removes files the current sync no longer writes', () => {
    const manifest = { packName: 'pack', files: { 'resources/pack/pack.yml': 'h', 'resources/pack/configuration/a.yml': 'h' } };
    const paths = new Set(['resources/pack/pack.yml']);
    expect(staleSyncFiles(ce, manifest, { packName: 'pack', paths })).toEqual([['resources', 'pack', 'configuration', 'a.yml']]);
  });

  it('removes the old pack folder after a rename', () => {
    const manifest = { packName: 'old', files: { 'resources/old/pack.yml': 'h', 'resources/old/resourcepack/x.png': 'h' } };
    const paths = new Set(['resources/new/pack.yml']);
    expect(staleSyncFiles(ce, manifest, { packName: 'new', paths })).toEqual([
      ['resources', 'old', 'pack.yml'],
      ['resources', 'old', 'resourcepack', 'x.png'],
    ]);
  });

  it('treats an older manifest as written for the current pack', () => {
    const manifest = parseSyncManifest({ 'resources/pack/pack.yml': 'h', 'items/a.yml': 'h' })!;
    expect(staleSyncFiles(ce, manifest, { packName: 'pack', paths: new Set() })).toEqual([['resources', 'pack', 'pack.yml']]);
    expect(staleSyncFiles(nexo, manifest, { packName: 'pack', paths: new Set() })).toEqual([['items', 'a.yml']]);
  });

  it('never reaches beyond the adapter with a tampered manifest', () => {
    const tampered = (packName: string, ...files: string[]) => ({ packName, files: Object.fromEntries(files.map((f) => [f, 'h'])) });
    const none = { packName: 'pack', paths: new Set<string>() };
    for (const manifest of [
      // CraftEngine's own packs
      tampered('internal', 'resources/internal/pack.yml', 'resources/internal/configuration/a.yml'),
      tampered('default_assets', 'resources/default_assets/pack.yml'),
      tampered('internal.', 'resources/internal./pack.yml'),
      // other files of the plugin folder, the server and beyond
      tampered('pack', 'config.yml', 'resources/other/pack.yml', '../../server.properties', 'resources/pack/../../config.yml'),
      tampered('..', 'resources/../pack.yml'),
      tampered('a/b', 'resources/a/b/pack.yml'),
      tampered('pack', 'resources/pack/configuration/CON.yml', 'resources/pack/configuration/a.yml '),
    ]) {
      expect(staleSyncFiles(ce, manifest, none), JSON.stringify(manifest)).toEqual([]);
    }
    expect(staleSyncFiles(nexo, tampered('pack', 'settings.yml', '../x', 'items/../../x'), none)).toEqual([]);
  });
});

describe('isSafeSegment', () => {
  it('accepts ordinary names', () => {
    for (const segment of ['pack.yml', 'my_pack', 'a-b+c', 'console.yml', 'com10', 'lpt0.txt']) {
      expect(isSafeSegment(segment), segment).toBe(true);
    }
  });

  it('refuses what Windows treats specially', () => {
    for (const segment of [
      '',
      '.',
      '..',
      'internal.',
      'internal ',
      'a.yml.',
      'CON',
      'con',
      'nul.yml',
      'Aux.txt',
      'prn',
      'COM1',
      'com9.yml',
      'LPT1',
      'lpt9.png',
      'a/b',
      'a\\b',
      'a:b',
    ]) {
      expect(isSafeSegment(segment), JSON.stringify(segment)).toBe(false);
    }
  });
});
