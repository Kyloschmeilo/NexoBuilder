/**
 * Freezes the Nexo export: a sha256 per file of every export mode and pack placement. Refactors
 * must leave nexo.golden.json untouched. Regenerate it only on purpose: `UPDATE_GOLDEN=1 npx vitest run src/golden`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { planMultiExport } from '../selection';
import type { ExportMode } from '../types';
import { goldenProject, goldenSecondProject } from './fixture';
import { archiveSnapshot } from './snapshot';

const GOLDEN_FILE = fileURLToPath(new URL('./nexo.golden.json', import.meta.url));

const MODES: ExportMode[] = ['full', 'pack', 'items'];

async function buildGolden(): Promise<Record<string, Record<string, string>>> {
  const golden: Record<string, Record<string, string>> = {};
  const placements = [
    ['folder', false],
    ['zip', true],
  ] as const;
  for (const [placement, asZip] of placements) {
    const multi = planMultiExport([{ project: goldenProject({ externalPackAsZip: asZip }) }]);
    for (const mode of MODES) golden[`single-${placement}-${mode}`] = await archiveSnapshot(multi, mode);
  }
  const both = planMultiExport([{ project: goldenProject({ externalPackAsZip: true }) }, { project: goldenSecondProject() }]);
  for (const mode of MODES) golden[`multi-${mode}`] = await archiveSnapshot(both, mode);
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
