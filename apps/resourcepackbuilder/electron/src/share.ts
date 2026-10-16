/**
 * File access for shared projects (folders in OneDrive, Google Drive, Dropbox ...).
 *
 * The UI may only use folders the user picked in the dialog themselves, and within them only the files of a shared
 * project (`isShareFilePath` of core's share format). Picked folders and the project folders in use are remembered in
 * `<userData>/shared-folders.json`; a project folder is forgotten again when its project stops being shared.
 */
import { DesktopError, type ShareFileInfo, type ShareFolderInfo, type ShareFolderPurpose } from '@resourcepackbuilder/desktop-contract';
import { ENTITY_DIRS, isShareFilePath, PROJECT_FILE, readProjectInfo } from '@resourcepackbuilder/sync';
import { app, BrowserWindow, dialog, type OpenDialogOptions, type WebContents } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { errorCode, LOCKED_CODES, openPath, TEMP_SUFFIX, writeFileAtomic } from './fileHelpers';
import { t } from './i18n';
import { handle, send } from './ipc';
import { testHooks } from './testHooks';

const IGNORED_NAMES = new Set(['desktop.ini', 'Thumbs.db', '.DS_Store']);
const DEFAULT_SUBFOLDER = 'ResourcepackBuilder project';
const WATCH_DEBOUNCE_MS = 250;

/* ------------------------------------------------------------------ allowed folders */

/** Folders the user allowed, remembered across restarts. */
let savedRoots: string[] | null = null;
/** Folders allowed for this run only (the e2e test's share folder). */
const sessionRoots = new Set<string>();

function rootsFile() {
  return path.join(app.getPath('userData'), 'shared-folders.json');
}

function loadRoots(): string[] {
  if (savedRoots) return savedRoots;
  savedRoots = [];
  let text: string;
  try {
    text = fs.readFileSync(rootsFile(), 'utf8');
  } catch (err) {
    if (errorCode(err) !== 'ENOENT') console.error('Could not read the allowed folders', err);
    return savedRoots;
  }
  try {
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('not a list');
    savedRoots = data.filter((root): root is string => typeof root === 'string' && path.isAbsolute(root));
  } catch (err) {
    // Keep the damaged file for inspection; the user picks the folders again
    console.error('The allowed folders are damaged and were reset', err);
    try {
      fs.renameSync(rootsFile(), `${rootsFile()}.bak`);
    } catch {
      // nothing to keep
    }
  }
  return savedRoots;
}

function saveRoots(list: string[]) {
  savedRoots = list;
  try {
    fs.mkdirSync(path.dirname(rootsFile()), { recursive: true });
    fs.writeFileSync(rootsFile(), JSON.stringify(list, null, 1));
  } catch (err) {
    console.error('Could not save allowed folders', err);
  }
}

function allRoots(): string[] {
  return [...loadRoots(), ...sessionRoots];
}

function rememberRoot(folder: string): string {
  const resolved = path.resolve(folder);
  const list = loadRoots();
  if (!list.includes(resolved)) saveRoots([...list, resolved]);
  return resolved;
}

function isInside(dir: string, root: string): boolean {
  return dir === root || dir.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
}

/** The real path (symbolic links resolved) of `target`; parts that do not exist yet are appended unchanged. */
async function realPath(target: string): Promise<string> {
  try {
    return await fsp.realpath(target);
  } catch (err) {
    const parent = path.dirname(target);
    if (errorCode(err) !== 'ENOENT' || parent === target) return target;
    return path.join(await realPath(parent), path.basename(target));
  }
}

/** The allowed root `folder` lies in – also after following links – or null. */
async function rootOf(folder: string): Promise<string | null> {
  const resolved = path.resolve(folder);
  const real = await realPath(resolved);
  for (const root of allRoots()) {
    if (isInside(resolved, root) && isInside(real, await realPath(root))) return root;
  }
  return null;
}

/** Resolves `folder` and makes sure it lies inside a folder the user picked. */
async function checkFolder(folder: string): Promise<string> {
  if (!(await rootOf(folder))) throw new DesktopError('folderNotAllowed');
  return path.resolve(folder);
}

/** The absolute path of a project file inside an allowed folder. */
async function filePath(folder: string, relativePath: string): Promise<string> {
  if (!isShareFilePath(relativePath)) throw new DesktopError('invalidFile', { file: relativePath });
  const dir = await checkFolder(folder);
  const target = path.join(dir, ...relativePath.split('/'));
  // An entity folder could be a link pointing outside the shared folder
  if (!isInside(await realPath(target), await realPath(dir))) throw new DesktopError('folderNotAllowed');
  return target;
}

/** Remembers a project folder in use, so it stays accessible after a restart even if its parent is forgotten. */
async function rememberProjectFolder(dir: string) {
  const root = await rootOf(dir);
  if (root && !sessionRoots.has(root)) rememberRoot(dir);
}

/** The project in `folder` is no longer shared: drop the folder (and the picked folders containing it). */
function forget(folder: string) {
  const dir = path.resolve(folder);
  const list = loadRoots();
  const kept = list.filter((root) => !isInside(dir, root));
  if (kept.length !== list.length) saveRoots(kept);
  for (const root of sessionRoots) if (isInside(dir, root)) sessionRoots.delete(root);
}

/* ------------------------------------------------------------------ files */

async function readProjectInfoIn(dir: string) {
  try {
    return readProjectInfo(await fsp.readFile(path.join(dir, PROJECT_FILE), 'utf8'));
  } catch {
    return null; // missing project file
  }
}

async function inspect(folder: string): Promise<ShareFolderInfo> {
  const dir = await checkFolder(folder);
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (errorCode(err) === 'ENOENT') return { exists: false, empty: true, project: null, children: [] };
    throw err;
  }
  const visible = entries.filter((entry) => !entry.name.startsWith('.') && !IGNORED_NAMES.has(entry.name));
  const project = await readProjectInfoIn(dir);
  const children: ShareFolderInfo['children'] = [];
  if (!project) {
    for (const entry of visible) {
      if (!entry.isDirectory()) continue;
      const childPath = path.join(dir, entry.name);
      const info = await readProjectInfoIn(childPath);
      if (info) children.push({ path: childPath, name: entry.name, projectName: info.name, projectId: info.id });
    }
  }
  return { exists: true, empty: visible.length === 0, project, children };
}

/** Creates (or reuses an empty) subfolder named after the project. */
async function createSubfolder(parent: string, name: string): Promise<string> {
  const base = await checkFolder(parent);
  const clean =
    name
      // eslint-disable-next-line no-control-regex -- control characters are invalid in file names
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/[. ]+$/g, '')
      .trim()
      .slice(0, 80) || DEFAULT_SUBFOLDER;
  let candidate = path.join(base, clean);
  for (let n = 2; fs.existsSync(candidate) && (await fsp.readdir(candidate)).length > 0; n++) {
    candidate = path.join(base, `${clean} (${n})`);
  }
  await fsp.mkdir(candidate, { recursive: true });
  return candidate;
}

async function fileInfo(file: string, relativePath: string): Promise<ShareFileInfo | null> {
  try {
    const stat = await fsp.stat(file);
    return stat.isFile() ? { path: relativePath, mtimeMs: stat.mtimeMs, size: stat.size } : null;
  } catch {
    return null; // just deleted or locked; picked up next time
  }
}

async function list(folder: string): Promise<ShareFileInfo[]> {
  const dir = await checkFolder(folder);
  await fsp.access(dir); // a missing folder (drive disconnected ...) makes the UI report "offline"
  const relativePaths = [PROJECT_FILE];
  for (const entityDir of ENTITY_DIRS) {
    try {
      for (const name of await fsp.readdir(path.join(dir, entityDir))) relativePaths.push(`${entityDir}/${name}`);
    } catch {
      // no such entity folder yet
    }
  }
  const result: ShareFileInfo[] = [];
  for (const relativePath of relativePaths) {
    if (!isShareFilePath(relativePath)) continue;
    const info = await fileInfo(path.join(dir, ...relativePath.split('/')), relativePath);
    if (info) result.push(info);
  }
  return result;
}

async function read(folder: string, relativePath: string): Promise<string | null> {
  const file = await filePath(folder, relativePath);
  try {
    return await fsp.readFile(file, 'utf8');
  } catch (err) {
    // missing or currently locked by the cloud service; retried next time
    const code = errorCode(err);
    if (code === 'ENOENT' || (code && LOCKED_CODES.has(code))) return null;
    throw err;
  }
}

async function write(folder: string, relativePath: string, content: string): Promise<ShareFileInfo> {
  const target = await filePath(folder, relativePath);
  await writeFileAtomic(target, content);
  const stat = await fsp.stat(target);
  return { path: relativePath, mtimeMs: stat.mtimeMs, size: stat.size };
}

/* ------------------------------------------------------------------ watching */

interface WatchEntry {
  sender: WebContents;
  timer: NodeJS.Timeout | undefined;
  watcher: fs.FSWatcher;
}

const watchers = new Map<string, WatchEntry>();

/**
 * Watches a shared folder and tells `sender` about changes. Returns false if the folder cannot be watched;
 * the UI then polls by itself.
 */
async function watch(sender: WebContents, folder: string): Promise<boolean> {
  const dir = await checkFolder(folder);
  await rememberProjectFolder(dir);
  const existing = watchers.get(dir);
  if (existing) {
    existing.sender = sender;
    return true;
  }
  try {
    const watcher = fs.watch(dir, { recursive: true }, (_event, filename) => {
      if (filename?.endsWith(TEMP_SUFFIX)) return;
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => send(entry.sender, 'share:changed', dir), WATCH_DEBOUNCE_MS);
    });
    const entry: WatchEntry = { sender, timer: undefined, watcher };
    watcher.on('error', () => unwatch(dir));
    watchers.set(dir, entry);
    return true;
  } catch {
    return false;
  }
}

function unwatch(folder: string) {
  const dir = path.resolve(folder);
  const entry = watchers.get(dir);
  if (!entry) return;
  clearTimeout(entry.timer);
  entry.watcher.close();
  watchers.delete(dir);
}

/* ------------------------------------------------------------------ IPC */

async function chooseFolder(sender: WebContents, purpose: ShareFolderPurpose): Promise<string | null> {
  if (testHooks.shareDir) {
    await fsp.mkdir(testHooks.shareDir, { recursive: true });
    const resolved = path.resolve(testHooks.shareDir);
    sessionRoots.add(resolved);
    return resolved;
  }
  const join = purpose === 'join';
  const window = BrowserWindow.fromWebContents(sender);
  const options: OpenDialogOptions = {
    title: join ? t('share.chooseJoinFolder') : t('share.chooseShareFolder'),
    buttonLabel: join ? t('share.open') : t('share.shareHere'),
    properties: ['openDirectory', 'createDirectory'],
  };
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  if (result.canceled || !result.filePaths[0]) return null;
  return rememberRoot(result.filePaths[0]);
}

export function registerShareHandlers(): void {
  handle('share:choose-folder', (event, purpose) => chooseFolder(event.sender, purpose));
  handle('share:inspect', (_event, folder) => inspect(folder));
  handle('share:create-subfolder', (_event, parent, name) => createSubfolder(parent, name));
  handle('share:list', (_event, folder) => list(folder));
  handle('share:read', (_event, folder, relativePath) => read(folder, relativePath));
  handle('share:write', (_event, folder, relativePath, content) => write(folder, relativePath, content));
  handle('share:watch', (event, folder) => watch(event.sender, folder));
  handle('share:unwatch', (_event, folder) => unwatch(folder));
  handle('share:forget', (_event, folder) => {
    unwatch(folder);
    forget(folder);
  });
  handle('share:open-folder', async (_event, folder) => openPath(await checkFolder(folder)));
  handle('share:user-name', () => {
    try {
      return os.userInfo().username || '';
    } catch {
      return '';
    }
  });
}
