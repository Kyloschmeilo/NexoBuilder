/**
 * Writes the project's files to the plugin folder of its target's server (e.g. plugins/Nexo). Whatever was written
 * last time and is now missing (deleted items, a different project) is removed; other files are left untouched. The
 * target's `sync-manifest.json` remembers what was written.
 */
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { serverAdapterFor } from '@resourcepackbuilder/test-server';
import {
  DesktopError,
  type TestServerSyncFile,
  type TestServerSyncOptions,
  type TestServerSyncResult,
} from '@resourcepackbuilder/desktop-contract';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { readJsonFile, writeFileAtomic } from '../fileHelpers';
import { t } from '../i18n';
import { manifestFile, pluginDir } from './paths';
import { isReloadPending, isRunning, requestReload } from './server';
import { logInfo, pushLog, setState, state } from './state';

/** Path relative to the plugin folder → SHA-1 of what was written. */
const manifestFilesSchema = z.record(z.string(), z.string());

/**
 * What the last sync wrote, and for which pack: CraftEngine's paths contain the pack name, so after a rename the old
 * files are only recognised (and removed) with the old name. Older manifests are a bare file list without a name.
 */
interface Manifest {
  packName: string | null;
  files: Record<string, string>;
}

const manifestSchema = z.union([
  z.object({ packName: z.string(), files: manifestFilesSchema }),
  manifestFilesSchema.transform((files) => ({ packName: null, files })),
]);

/** The absolute destination of a project file, or null if the path is not one the project may write. */
function syncDestination(target: PackTargetId, packName: string, relativePath: string): string | null {
  const segments = serverAdapterFor(target).syncPathSegments(relativePath, { packName });
  return segments && path.join(pluginDir(target), ...segments);
}

async function pruneEmptyDirs(target: PackTargetId, dir: string) {
  const stopAt = pluginDir(target);
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
async function readManifest(target: PackTargetId): Promise<Manifest> {
  const manifest = await readJsonFile(
    manifestFile(target),
    (data) => manifestSchema.safeParse(data).data ?? null,
    (backup) => pushLog(t('testServer.manifestReset', { file: backup, folder: serverAdapterFor(target).pluginDir }), 'err'),
  );
  return manifest ?? { packName: null, files: {} };
}

/** The plugin's config file (e.g. plugins/Nexo/settings.yml). */
const pluginConfigPath = (target: PackTargetId) => path.join(pluginDir(target), serverAdapterFor(target).configFile);

/** Returns whether the plugin's config file changed. */
async function writeSettings(target: PackTargetId, settings: string | undefined): Promise<boolean> {
  if (settings === undefined) return false;
  const file = pluginConfigPath(target);
  const current = fs.existsSync(file) ? await fsp.readFile(file, 'utf8') : null;
  if (current === settings) return false;
  await writeFileAtomic(file, settings);
  return true;
}

export async function syncFiles(
  files: TestServerSyncFile[],
  { target, packName, reload, settings }: TestServerSyncOptions,
): Promise<TestServerSyncResult> {
  // A running server only reads its own plugin folder; files for another target would never arrive
  if (isRunning() && state.target !== target) {
    throw new DesktopError('wrongTarget', {
      server: serverAdapterFor(state.target ?? target).pluginName,
      project: serverAdapterFor(target).pluginName,
    });
  }
  const manifest = await readManifest(target);
  // Paths the last sync wrote are checked against the pack name they were written for (see Manifest)
  const writtenPackName = manifest.packName ?? packName;
  const next: Record<string, string> = {};
  let written = 0;
  let deleted = 0;
  let skipped = 0;
  for (const file of files) {
    const destination = syncDestination(target, packName, file.path);
    if (!destination) {
      skipped++;
      pushLog(t('testServer.skippedFile', { path: file.path }), 'err');
      continue;
    }
    const data = typeof file.data === 'string' ? Buffer.from(file.data, 'utf8') : Buffer.from(file.data);
    const hash = crypto.createHash('sha1').update(data).digest('hex');
    next[file.path] = hash;
    if (manifest.files[file.path] !== hash || !fs.existsSync(destination)) {
      await writeFileAtomic(destination, data);
      written++;
    }
  }
  for (const relativePath of Object.keys(manifest.files)) {
    if (relativePath in next) continue;
    const destination = syncDestination(target, writtenPackName, relativePath);
    if (!destination) continue; // invalid entry
    await fsp.rm(destination, { force: true });
    await pruneEmptyDirs(target, path.dirname(destination));
    deleted++;
  }
  const settingsChanged = await writeSettings(target, settings);
  await fsp.mkdir(path.dirname(manifestFile(target)), { recursive: true });
  await fsp.writeFile(manifestFile(target), JSON.stringify({ packName, files: next } satisfies Manifest));

  const changed = written > 0 || deleted > 0 || settingsChanged;
  const reloaded = changed && reload && state.status === 'running' && (requestReload() || isReloadPending());
  if (changed) logInfo(t(settingsChanged ? 'testServer.syncedSettings' : 'testServer.synced', { written, deleted }));
  setState({ lastSync: Date.now() });
  return { written, deleted, skipped, settingsChanged, reloaded, total: files.length };
}

export async function readPluginConfig(target: PackTargetId): Promise<string | null> {
  try {
    return await fsp.readFile(pluginConfigPath(target), 'utf8');
  } catch {
    return null;
  }
}
