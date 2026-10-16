/**
 * The test server's sync manifest (`sync-manifest.json`): what the last sync wrote into the plugin folder and for
 * which pack. It decides which files a sync removes, so a tampered manifest must never reach beyond what the adapter
 * allows.
 */
import { z } from 'zod';
import type { ServerAdapter } from './adapter';

export interface SyncManifest {
  /**
   * The pack the files were written for. CraftEngine's paths contain the pack name, so after a rename the old files
   * are only recognised (and removed) with the old name. Null in older manifests (a bare file list).
   */
  packName: string | null;
  /** Path relative to the plugin folder → SHA-1 of what was written. */
  files: Record<string, string>;
}

const manifestFilesSchema = z.record(z.string(), z.string());

const syncManifestSchema = z.union([
  z.object({ packName: z.string(), files: manifestFilesSchema }),
  manifestFilesSchema.transform((files) => ({ packName: null, files })),
]);

/** The manifest read from its JSON, or null if it has neither the current nor the older shape. */
export function parseSyncManifest(data: unknown): SyncManifest | null {
  return syncManifestSchema.safeParse(data).data ?? null;
}

/**
 * The files the last sync wrote that the current one no longer writes, as path segments relative to the plugin
 * folder. Each one is checked by the adapter against the pack it was written for; anything it refuses (other
 * plugins' files, CraftEngine's own packs, "..") is left alone.
 */
export function staleSyncFiles(
  adapter: ServerAdapter,
  manifest: SyncManifest,
  current: { packName: string; paths: ReadonlySet<string> },
): string[][] {
  const packName = manifest.packName ?? current.packName;
  const stale: string[][] = [];
  for (const relativePath of Object.keys(manifest.files)) {
    if (current.paths.has(relativePath)) continue;
    const segments = adapter.syncPathSegments(relativePath, { packName });
    if (segments) stale.push(segments);
  }
  return stale;
}
