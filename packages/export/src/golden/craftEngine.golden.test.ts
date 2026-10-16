/**
 * Freezes the CraftEngine export like golden.test.ts freezes Nexo's: a sha256 per file of a CraftEngine project in
 * every export mode, and of an archive that mixes it with a Nexo project. Regenerate it only on purpose:
 * `UPDATE_GOLDEN=1 npx vitest run src/golden`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { planMultiExport } from '../selection';
import type { ExportMode } from '../types';
import { goldenCraftEngineProject, goldenSecondProject } from './fixture';
import { archiveSnapshot } from './snapshot';

const GOLDEN_FILE = fileURLToPath(new URL('./craftEngine.golden.json', import.meta.url));

const MODES: ExportMode[] = ['full', 'pack', 'items'];

async function buildGolden(): Promise<Record<string, Record<string, string>>> {
  const golden: Record<string, Record<string, string>> = {};
  const single = planMultiExport([{ project: goldenCraftEngineProject() }]);
  for (const mode of MODES) golden[`single-${mode}`] = await archiveSnapshot(single, mode);
  const mixed = planMultiExport([{ project: goldenCraftEngineProject() }, { project: goldenSecondProject() }]);
  for (const mode of MODES) golden[`mixed-${mode}`] = await archiveSnapshot(mixed, mode);
  return golden;
}

describe('CraftEngine export golden snapshot', () => {
  it('matches craftEngine.golden.json byte for byte', async () => {
    const actual = await buildGolden();
    if (process.env.UPDATE_GOLDEN === '1') {
      writeFileSync(GOLDEN_FILE, JSON.stringify(actual, null, 2) + '\n');
    } else if (!existsSync(GOLDEN_FILE)) {
      throw new Error('craftEngine.golden.json is missing. Generate it with UPDATE_GOLDEN=1.');
    }
    expect(actual).toEqual(JSON.parse(readFileSync(GOLDEN_FILE, 'utf8')));
  });
});
