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
