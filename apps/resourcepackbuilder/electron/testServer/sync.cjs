// @ts-check
/**
 * Writes the project's files to plugins/Nexo. Whatever was written last time and is now missing (deleted items,
 * a different project) is removed; other files are left untouched. `sync-manifest.json` remembers what was written.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const { writeFileAtomic } = require('../fileHelpers.cjs');
const { t } = require('../i18n.cjs');
const { manifestFile, nexoDir, rootDir } = require('./paths.cjs');
const { isReloadPending, requestReload } = require('./server.cjs');
const { logInfo, pushLog, setState, state } = require('./state.cjs');

/** @typedef {import('../../src/platform/desktopApi').TestServerSyncResult} TestServerSyncResult */

// sounds.yml/paintings.yml: plugins/Nexo has only a single file of each
const SYNC_PATH = /^((items|recipes|glyphs|pack\/external_packs)\/.+|sounds\.yml|paintings\.yml)$/;
const SAFE_SEGMENT = /^[A-Za-z0-9_.+-]+$/;

/**
 * The absolute target of a project file, or null if the path is not one the project may write.
 * @param {unknown} relativePath
 */
function syncTarget(relativePath) {
  if (typeof relativePath !== 'string' || !SYNC_PATH.test(relativePath)) return null;
  const segments = relativePath.split('/');
  if (segments.some((segment) => !SAFE_SEGMENT.test(segment) || segment === '.' || segment === '..')) return null;
  return path.join(nexoDir(), ...segments);
}

/**
 * The file content as bytes, or null if `data` is neither text nor bytes.
 * @param {unknown} data
 */
function toBuffer(data) {
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  if (data instanceof Uint8Array) return Buffer.from(data);
  return null;
}

/** @param {string} dir */
async function pruneEmptyDirs(dir) {
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

/** @returns {Promise<Record<string, string>>} */
async function readManifest() {
  try {
    return JSON.parse(await fsp.readFile(manifestFile(), 'utf8'));
  } catch {
    return {}; // first sync
  }
}

/**
 * @param {unknown} settings
 * @returns {Promise<boolean>} whether settings.yml changed
 */
async function writeSettings(settings) {
  if (typeof settings !== 'string') return false;
  const target = path.join(nexoDir(), 'settings.yml');
  const current = fs.existsSync(target) ? await fsp.readFile(target, 'utf8') : null;
  if (current === settings) return false;
  await writeFileAtomic(target, settings);
  return true;
}

/**
 * @param {unknown} files
 * @param {unknown} options
 * @returns {Promise<TestServerSyncResult>}
 */
async function syncFiles(files, options) {
  if (!Array.isArray(files)) throw new Error(t('testServer.invalidFiles'));
  /** @type {{ reload?: unknown, settings?: unknown }} */
  const { reload, settings } = options !== null && typeof options === 'object' ? options : {};
  const manifest = await readManifest();
  /** @type {Record<string, string>} */
  const next = {};
  let written = 0;
  let deleted = 0;
  let skipped = 0;
  for (const file of files) {
    const relativePath = file?.path;
    const target = syncTarget(relativePath);
    const data = toBuffer(file?.data);
    if (!target || !data) {
      skipped++;
      pushLog(t('testServer.skippedFile', { path: String(relativePath) }), 'err');
      continue;
    }
    const hash = crypto.createHash('sha1').update(data).digest('hex');
    next[relativePath] = hash;
    if (manifest[relativePath] !== hash || !fs.existsSync(target)) {
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
  const reloaded = changed && reload === true && state.status === 'running' && (requestReload() || isReloadPending());
  if (changed) logInfo(t(settingsChanged ? 'testServer.syncedSettings' : 'testServer.synced', { written, deleted }));
  setState({ lastSync: Date.now() });
  return { written, deleted, skipped, settingsChanged, reloaded, total: files.length };
}

async function readNexoSettings() {
  try {
    return await fsp.readFile(path.join(nexoDir(), 'settings.yml'), 'utf8');
  } catch {
    return null;
  }
}

module.exports = { syncFiles, readNexoSettings };
