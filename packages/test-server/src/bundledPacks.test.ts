import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { missingBundledFiles } from './bundledPacks';

async function jar(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [name, text] of Object.entries(files)) zip.file(name, text);
  return zip.generateAsync({ type: 'uint8array' });
}

const decode = (data: Uint8Array) => new TextDecoder().decode(data);

describe('missingBundledFiles', () => {
  it('returns the files of packs that are not on the server yet', async () => {
    const plugin = await jar({
      'resources/_index.json': '{}',
      'resources/default_templates/pack.yml': 'namespace: default',
      'resources/default_templates/configuration/templates/loot_tables.yml': 'templates: {}',
      'resources/default_templates/_index.json': '{}',
      'resources/internal/pack.yml': 'namespace: internal',
      'config.yml': 'x: 1',
    });
    const files = await missingBundledFiles(plugin, 'resources', new Set(['internal', 'test_pack']));
    expect(files.map((f) => f.path).sort()).toEqual([
      'default_templates/configuration/templates/loot_tables.yml',
      'default_templates/pack.yml',
    ]);
    expect(decode(files.find((f) => f.path === 'default_templates/pack.yml')!.data)).toBe('namespace: default');
  });

  it('skips unsafe paths and unreadable archives', async () => {
    const plugin = await jar({ 'resources/../evil/pack.yml': 'x', 'resources/ok/pack.yml': 'y' });
    expect((await missingBundledFiles(plugin, 'resources', new Set())).map((f) => f.path)).toEqual(['ok/pack.yml']);
    expect(await missingBundledFiles(new Uint8Array([1, 2, 3]), 'resources', new Set())).toEqual([]);
  });
});
