// @ts-check
/** File helpers shared by the share and test-server modules. */
const { shell } = require('electron');
const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const path = require('node:path');

/** Error codes of a target that is briefly locked on Windows (cloud service, virus scanner, another reader). */
const LOCKED_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RENAME_ATTEMPTS = 7;
/** Suffix of the temporary files written by writeFileAtomic; watchers ignore files ending in it. */
const TEMP_SUFFIX = '.tmp';

/** @param {number} ms */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param {unknown} err */
function errorCode(err) {
  return err instanceof Error && 'code' in err ? err.code : undefined;
}

/**
 * Writes to a temporary file next to `target` and renames it, so nobody reads a half-written file.
 * A locked target is retried a few times before giving up.
 *
 * @param {string} target
 * @param {string | Uint8Array} data
 */
async function writeFileAtomic(target, data) {
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const tempPath = path.join(path.dirname(target), `.${path.basename(target)}.${crypto.randomBytes(4).toString('hex')}${TEMP_SUFFIX}`);
  await fsp.writeFile(tempPath, data);
  for (let attempt = 1; ; attempt++) {
    try {
      await fsp.rename(tempPath, target);
      return;
    } catch (err) {
      const code = errorCode(err);
      if (attempt >= RENAME_ATTEMPTS || typeof code !== 'string' || !LOCKED_CODES.has(code)) {
        await fsp.rm(tempPath, { force: true });
        throw err;
      }
      await delay(80 * attempt);
    }
  }
}

/**
 * Opens a folder in the system file manager.
 * @param {string} dir
 */
async function openPath(dir) {
  const error = await shell.openPath(dir);
  if (error) throw new Error(error);
}

module.exports = { LOCKED_CODES, TEMP_SUFFIX, errorCode, writeFileAtomic, openPath };
