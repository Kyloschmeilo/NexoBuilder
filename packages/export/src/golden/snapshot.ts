/** Hashes of an export archive for the golden snapshots: a sha256 per file, nested ZIPs by their sorted entries. */
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import type { MultiExportPlan } from '../selection';
import type { ExportMode } from '../types';
import { buildMultiExportZip } from '../zip';

const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');

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

/** The hash of every file of the archive `multi` exports in `mode`, by path. */
export async function archiveSnapshot(multi: MultiExportPlan, mode: ExportMode): Promise<Record<string, string>> {
  return hashEntries((await buildMultiExportZip(multi, mode)).data);
}
