import { describe, expect, it } from 'vitest';
import { compareVersions, versionSupport } from './versions';

describe('versions', () => {
  it('compares versions and checks support ranges', () => {
    expect(compareVersions('1.21.11', '1.21.4')).toBe(1);
    expect(compareVersions('26.1', '26.1.0')).toBe(0);
    expect(versionSupport('1.21.4', { minVersion: '1.21.5' })).toBe('tooOld');
    expect(versionSupport('26.3', { maxVersion: '1.21.11' })).toBe('removed');
    expect(versionSupport('1.21.11', { minVersion: '1.21.4', maxVersion: '26.3' })).toBe('supported');
  });
});
