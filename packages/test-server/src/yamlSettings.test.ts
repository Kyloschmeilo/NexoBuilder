import { describe, expect, it } from 'vitest';
import { patchYamlSettings } from './yamlSettings';

const options = { header: ' Test header' };

describe('patchYamlSettings', () => {
  it('creates a small file with the header when there is none', () => {
    expect(patchYamlSettings(null, [[['a', 'b'], 1]], options)).toBe('# Test header\n\na:\n  b: 1\n');
  });

  it('returns the file unchanged when the values only differ in how the plugin writes them', () => {
    const current = 'a:\n  port: "8082"\n  type: selfhost\n  flag: "TRUE"\n';
    const overrides: Array<[string[], unknown]> = [
      [['a', 'port'], 8082],
      [['a', 'type'], 'SELFHOST'],
      [['a', 'flag'], true],
    ];
    expect(patchYamlSettings(current, overrides, options)).toBe(current);
  });

  it('never takes null or a boolean for a number', () => {
    expect(patchYamlSettings('port:\n', [[['port'], 0]], options)).toBe('port: 0\n');
    expect(patchYamlSettings('port: true\n', [[['port'], 1]], options)).toBe('port: 1\n');
  });

  it('reads the file in the given YAML version', () => {
    // "yes" is a boolean in YAML 1.1 only
    expect(patchYamlSettings('flag: yes\n', [[['flag'], true]], { ...options, version: '1.1' })).toBe('flag: yes\n');
    expect(patchYamlSettings('flag: yes\n', [[['flag'], true]], options)).toBe('flag: true\n');
  });
});
