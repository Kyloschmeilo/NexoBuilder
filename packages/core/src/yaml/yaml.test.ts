import { describe, expect, it } from 'vitest';
import { parseYaml } from './yaml';

describe('parseYaml', () => {
  it('reports parse errors as issue codes with their position', () => {
    expect(parseYaml('a: 1\na: 2').problem).toMatchObject({ code: 'yaml.duplicateKey', args: { line: 2 } });
    expect(parseYaml('a: [1').problem).toMatchObject({ code: 'yaml.syntax', args: { line: expect.any(Number) } });
    expect(parseYaml('a: 1').problem).toBeNull();
  });
});
