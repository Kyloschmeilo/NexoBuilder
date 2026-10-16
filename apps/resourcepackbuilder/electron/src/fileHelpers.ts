/** File helpers shared by the share and test-server modules. */
import { shell } from 'electron';
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';

/** Error codes of a target that is briefly locked on Windows (cloud service, virus scanner, another reader). */
export const LOCKED_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RENAME_ATTEMPTS = 7;
/** Suffix of the temporary files written by writeFileAtomic; watchers ignore files ending in it. */
export const TEMP_SUFFIX = '.tmp';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function errorCode(err: unknown): string | undefined {
  return err instanceof Error && 'code' in err && typeof err.code === 'string' ? err.code : undefined;
}

/**
 * Writes to a temporary file next to `target` and renames it, so nobody reads a half-written file.
 * A locked target is retried a few times before giving up.
 */
export async function writeFileAtomic(target: string, data: string | Uint8Array): Promise<void> {
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const tempPath = path.join(path.dirname(target), `.${path.basename(target)}.${crypto.randomBytes(4).toString('hex')}${TEMP_SUFFIX}`);
  await fsp.writeFile(tempPath, data);
  for (let attempt = 1; ; attempt++) {
    try {
      await fsp.rename(tempPath, target);
      return;
    } catch (err) {
      const code = errorCode(err);
      if (attempt >= RENAME_ATTEMPTS || !code || !LOCKED_CODES.has(code)) {
        await fsp.rm(tempPath, { force: true });
        throw err;
      }
      await delay(80 * attempt);
    }
  }
}

/** Opens a folder in the system file manager. */
export async function openPath(dir: string): Promise<void> {
  const error = await shell.openPath(dir);
  if (error) throw new Error(error);
}

/**
 * Reads a JSON file the program wrote itself and checks it with `parse`. A missing file yields `null`; a file that is
 * unreadable or fails the check is kept as `<file>.bak` (so nothing is silently lost), logged, reported to
 * `onDamaged` and also yields `null`.
 */
export async function readJsonFile<T>(
  file: string,
  parse: (data: unknown) => T | null,
  onDamaged?: (backup: string) => void,
): Promise<T | null> {
  let text: string;
  try {
    text = await fsp.readFile(file, 'utf8');
  } catch (err) {
    if (errorCode(err) !== 'ENOENT') console.error(`Could not read ${file}`, err);
    return null;
  }
  try {
    const value = parse(JSON.parse(text));
    if (value !== null) return value;
  } catch {
    // not JSON; handled below
  }
  const backup = `${file}.bak`;
  console.error(`${file} is damaged; it was moved to ${backup} and the defaults are used.`);
  await fsp.rename(file, backup).catch((err) => console.error(`Could not back up ${file}`, err));
  onDamaged?.(backup);
  return null;
}
