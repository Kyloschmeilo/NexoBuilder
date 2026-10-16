import { describe, expect, it } from 'vitest';
import { PACK_TARGETS } from '@resourcepackbuilder/core/project';
import { serverAdapterFor } from './adapter';
import { parseServerLogLine } from './serverLog';

describe('server adapters', () => {
  it('has one adapter per pack target', () => {
    for (const target of PACK_TARGETS) expect(serverAdapterFor(target).target).toBe(target);
  });

  it('reads the shared Paper lines for every target', () => {
    for (const target of PACK_TARGETS) {
      expect(parseServerLogLine(serverAdapterFor(target), '[14:02:11 INFO]: Done (6.512s)! For help, type "help"')).toEqual({
        type: 'started',
      });
    }
  });
});

describe('the CraftEngine adapter skeleton', () => {
  const ce = serverAdapterFor('craftengine');

  it('gives items as "ce item give <player> <id> <amount>"', () => {
    expect(ce.giveCommand('testpack:ruby', 2, 'Steve')).toBe('ce item give Steve testpack:ruby 2');
    expect(() => ce.giveCommand('ruby 64 @a', 1, 'Steve')).toThrow(RangeError);
    expect(() => ce.giveCommand('ruby', 1, '@a')).toThrow(RangeError);
  });

  it('only lets the project write its own pack under resources/', () => {
    const project = { packName: 'test_pack' };
    expect(ce.syncPathSegments('resources/test_pack/pack.yml', project)).toEqual(['resources', 'test_pack', 'pack.yml']);
    expect(ce.syncPathSegments('resources/test_pack/configuration/items/a.yml', project)).not.toBeNull();
    expect(ce.syncPathSegments('resources/test_pack/resourcepack/assets/x.png', project)).not.toBeNull();
    for (const path of [
      'config.yml',
      'resources/other/pack.yml',
      'resources/test_pack/configuration/../../x',
      'resources/test_pack/x.yml',
    ]) {
      expect(ce.syncPathSegments(path, project), path).toBeNull();
    }
    expect(ce.syncPathSegments('resources/../pack.yml', { packName: '..' })).toBeNull();
  });
});
