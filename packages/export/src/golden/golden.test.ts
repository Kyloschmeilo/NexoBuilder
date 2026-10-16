/**
 * Freezes the Nexo export: a sha256 per file of every export mode and pack placement. Refactors
 * must leave nexo.golden.json untouched. Regenerate it only on purpose: `UPDATE_GOLDEN=1 npx vitest run src/golden`.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { planMultiExport, type MultiExportPlan } from '../selection';
import type { ExportMode } from '../types';
import { buildMultiExportZip } from '../zip';
import { goldenProject, goldenSecondProject } from './fixture';

const GOLDEN_FILE = fileURLToPath(new URL('./nexo.golden.json', import.meta.url));

const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');

/** sha256 of every file of the export by path; nested ZIPs are hashed by their sorted entries. */
async function hashEntries(data: Uint8Array): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(data);
  const result: Record<string, string> = {};
  for (const path of Object.keys(zip.files).sort()) {
    const entry = zip.files[path];
    if (entry.dir) continue;
    const bytes = await entry.async('uint8array');
    if (path.endsWith('.zip')) {
      const inner = await hashEntries(bytes);
      result[path] = sha256(
        Object.entries(inner)
          .map(([p, h]) => `${p}:${h}`)
          .join('\n'),
      );
      for (const [p, h] of Object.entries(inner)) result[`${path}!/${p}`] = h;
    } else {
      result[path] = sha256(bytes);
    }
  }
  return result;
}

export async function goldenSnapshot(multi: MultiExportPlan, mode: ExportMode): Promise<Record<string, string>> {
  return hashEntries((await buildMultiExportZip(multi, mode)).data);
}

const MODES: ExportMode[] = ['full', 'pack', 'items'];

async function buildGolden(): Promise<Record<string, Record<string, string>>> {
  const golden: Record<string, Record<string, string>> = {};
  const placements = [
    ['folder', false],
    ['zip', true],
  ] as const;
  for (const [placement, asZip] of placements) {
    const multi = planMultiExport([{ project: goldenProject({ externalPackAsZip: asZip }) }]);
    for (const mode of MODES) golden[`single-${placement}-${mode}`] = await goldenSnapshot(multi, mode);
  }
  const both = planMultiExport([{ project: goldenProject({ externalPackAsZip: true }) }, { project: goldenSecondProject() }]);
  for (const mode of MODES) golden[`multi-${mode}`] = await goldenSnapshot(both, mode);
  return golden;
}

describe('Nexo export golden snapshot', () => {
  it('matches nexo.golden.json byte for byte', async () => {
    const actual = await buildGolden();
    if (process.env.UPDATE_GOLDEN === '1') {
      writeFileSync(GOLDEN_FILE, JSON.stringify(actual, null, 2) + '\n');
    } else if (!existsSync(GOLDEN_FILE)) {
      throw new Error('nexo.golden.json is missing. Generate it with UPDATE_GOLDEN=1.');
    }
    expect(actual).toEqual(JSON.parse(readFileSync(GOLDEN_FILE, 'utf8')));
  });

  it('is deterministic', async () => {
    expect(await buildGolden()).toEqual(await buildGolden());
  });
});
