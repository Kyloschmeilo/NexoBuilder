/**
 * Writes the project's files to plugins/Nexo. Whatever was written last time and is now missing (deleted items,
 * a different project) is removed; other files are left untouched. `sync-manifest.json` remembers what was written.
 */
import { syncPathSegments } from '@resourcepackbuilder/core/testServer/syncPaths';
import type { TestServerSyncFile, TestServerSyncOptions, TestServerSyncResult } from '@resourcepackbuilder/desktop-contract';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { readJsonFile, writeFileAtomic } from '../fileHelpers';
import { t } from '../i18n';
import { manifestFile, nexoDir, rootDir } from './paths';
import { isReloadPending, requestReload } from './server';
import { logInfo, pushLog, setState, state } from './state';

/** Path relative to plugins/Nexo → SHA-1 of what was written. */
const manifestSchema = z.record(z.string(), z.string());

/** The absolute target of a project file, or null if the path is not one the project may write. */
function syncTarget(relativePath: string): string | null {
  const segments = syncPathSegments(relativePath);
  return segments && path.join(nexoDir(), ...segments);
}

async function pruneEmptyDirs(dir: string) {
  const stopAt = nexoDir();
  let current = dir;
  while (current.startsWith(stopAt + path.sep)) {
    try {
      if ((await fsp.readdir(current)).length > 0) return;
      await fsp.rmdir(current);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}

/**
 * What the last sync wrote. Missing on the first sync; a damaged manifest is kept as .bak and reported in the console,
 * because files of earlier syncs can then no longer be cleaned up.
 */
async function readManifest(): Promise<Record<string, string>> {
  const manifest = await readJsonFile(
    manifestFile(),
    (data) => manifestSchema.safeParse(data).data ?? null,
    (backup) => pushLog(t('testServer.manifestReset', { file: backup }), 'err'),
  );
  return manifest ?? {};
}

/** Returns whether settings.yml changed. */
async function writeSettings(settings: string | undefined): Promise<boolean> {
  if (settings === undefined) return false;
  const target = path.join(nexoDir(), 'settings.yml');
  const current = fs.existsSync(target) ? await fsp.readFile(target, 'utf8') : null;
  if (current === settings) return false;
  await writeFileAtomic(target, settings);
  return true;
}

export async function syncFiles(files: TestServerSyncFile[], { reload, settings }: TestServerSyncOptions): Promise<TestServerSyncResult> {
  const manifest = await readManifest();
  const next: Record<string, string> = {};
  let written = 0;
  let deleted = 0;
  let skipped = 0;
  for (const file of files) {
    const target = syncTarget(file.path);
    if (!target) {
      skipped++;
      pushLog(t('testServer.skippedFile', { path: file.path }), 'err');
      continue;
    }
    const data = typeof file.data === 'string' ? Buffer.from(file.data, 'utf8') : Buffer.from(file.data);
    const hash = crypto.createHash('sha1').update(data).digest('hex');
    next[file.path] = hash;
    if (manifest[file.path] !== hash || !fs.existsSync(target)) {
      await writeFileAtomic(target, data);
      written++;
    }
  }
  for (const relativePath of Object.keys(manifest)) {
    if (relativePath in next) continue;
    const target = syncTarget(relativePath);
    if (!target) continue; // invalid entry
    await fsp.rm(target, { force: true });
    await pruneEmptyDirs(path.dirname(target));
    deleted++;
  }
  const settingsChanged = await writeSettings(settings);
  await fsp.mkdir(rootDir(), { recursive: true });
  await fsp.writeFile(manifestFile(), JSON.stringify(next));

  const changed = written > 0 || deleted > 0 || settingsChanged;
  const reloaded = changed && reload && state.status === 'running' && (requestReload() || isReloadPending());
  if (changed) logInfo(t(settingsChanged ? 'testServer.syncedSettings' : 'testServer.synced', { written, deleted }));
  setState({ lastSync: Date.now() });
  return { written, deleted, skipped, settingsChanged, reloaded, total: files.length };
}

export async function readNexoSettings(): Promise<string | null> {
  try {
    return await fsp.readFile(path.join(nexoDir(), 'settings.yml'), 'utf8');
  } catch {
    return null;
  }
}
