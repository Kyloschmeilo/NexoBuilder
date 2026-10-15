// @ts-check
/**
 * File access for shared projects (folders in OneDrive, Google Drive, Dropbox ...).
 *
 * The UI may only use folders the user picked in the dialog themselves (remembered in
 * `<userData>/shared-folders.json`), and within them only the files of a shared project:
 * project.json, README.txt, folders/*.json, items/*.json, glyphs/*.json, sounds/*.json, paintings/*.json.
 */
const { app, BrowserWindow, dialog } = require('electron');
const fs = require('node:fs');
const fsp = fs.promises;
const os = require('node:os');
const path = require('node:path');
const { errorCode, LOCKED_CODES, openPath, TEMP_SUFFIX, writeFileAtomic } = require('./fileHelpers.cjs');
const { t } = require('./i18n.cjs');
const { handle, send } = require('./ipc.cjs');
const { testHooks } = require('./testHooks.cjs');

/** @typedef {import('../src/platform/desktopApi').ShareFileInfo} ShareFileInfo */
/** @typedef {import('../src/platform/desktopApi').ShareFolderInfo} ShareFolderInfo */

const FILE_PATTERN = /^(project\.json|README\.txt|(folders|items|glyphs|sounds|paintings)\/[A-Za-z0-9_-]{1,64}\.json)$/;
const ENTITY_DIRS = ['folders', 'items', 'glyphs', 'sounds', 'paintings'];
const IGNORED_NAMES = new Set(['desktop.ini', 'Thumbs.db', '.DS_Store']);
const DEFAULT_SUBFOLDER = 'ResourcepackBuilder project';
const WATCH_DEBOUNCE_MS = 250;

/* ------------------------------------------------------------------ allowed folders */

/** @type {string[] | null} */
let roots = null;

function rootsFile() {
  return path.join(app.getPath('userData'), 'shared-folders.json');
}

function loadRoots() {
  if (roots) return roots;
  try {
    const data = JSON.parse(fs.readFileSync(rootsFile(), 'utf8'));
    roots = Array.isArray(data) ? data.filter((root) => typeof root === 'string') : [];
  } catch {
    roots = [];
  }
  return roots;
}

/** @param {string} folder */
function allowRoot(folder) {
  const resolved = path.resolve(folder);
  const list = loadRoots();
  if (!list.includes(resolved)) {
    list.push(resolved);
    try {
      fs.mkdirSync(path.dirname(rootsFile()), { recursive: true });
      fs.writeFileSync(rootsFile(), JSON.stringify(list, null, 1));
    } catch (err) {
      console.error('Could not save allowed folders', err);
    }
  }
  return resolved;
}

/**
 * @param {string} dir
 * @param {string} root
 */
function isInside(dir, root) {
  return dir === root || dir.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
}

/**
 * The real path (symbolic links resolved) of `target`; parts that do not exist yet are appended unchanged.
 * @param {string} target
 * @returns {Promise<string>}
 */
async function realPath(target) {
  try {
    return await fsp.realpath(target);
  } catch (err) {
    const parent = path.dirname(target);
    if (errorCode(err) !== 'ENOENT' || parent === target) return target;
    return path.join(await realPath(parent), path.basename(target));
  }
}

/**
 * Resolves `folder` and makes sure it lies inside a folder the user picked – also after following links.
 * @param {unknown} folder
 */
async function checkFolder(folder) {
  if (typeof folder !== 'string' || !folder) throw new Error(t('share.invalidFolder'));
  const resolved = path.resolve(folder);
  const real = await realPath(resolved);
  for (const root of loadRoots()) {
    if (isInside(resolved, root) && isInside(real, await realPath(root))) return resolved;
  }
  throw new Error(t('share.folderNotAllowed'));
}

/**
 * The absolute path of a project file inside an allowed folder.
 * @param {unknown} folder
 * @param {unknown} relativePath
 */
async function filePath(folder, relativePath) {
  if (typeof relativePath !== 'string' || !FILE_PATTERN.test(relativePath))
    throw new Error(t('share.invalidFile', { file: String(relativePath) }));
  const dir = await checkFolder(folder);
  const target = path.join(dir, ...relativePath.split('/'));
  // An entity folder could be a link pointing outside the shared folder
  if (!isInside(await realPath(target), await realPath(dir))) throw new Error(t('share.folderNotAllowed'));
  return target;
}

/* ------------------------------------------------------------------ files */

/** @param {string} dir */
async function readProjectInfo(dir) {
  try {
    const envelope = JSON.parse(await fsp.readFile(path.join(dir, 'project.json'), 'utf8'));
    if (envelope?.format === 'resourcepackbuilder-share' && typeof envelope.data?.id === 'string') {
      return { id: envelope.data.id, name: String(envelope.data.name ?? '') };
    }
  } catch {
    // missing or incomplete project file
  }
  return null;
}

/**
 * @param {unknown} folder
 * @returns {Promise<ShareFolderInfo>}
 */
async function inspect(folder) {
  const dir = await checkFolder(folder);
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (errorCode(err) === 'ENOENT') return { exists: false, empty: true, project: null, children: [] };
    throw err;
  }
  const visible = entries.filter((entry) => !entry.name.startsWith('.') && !IGNORED_NAMES.has(entry.name));
  const project = await readProjectInfo(dir);
  /** @type {ShareFolderInfo['children']} */
  const children = [];
  if (!project) {
    for (const entry of visible) {
      if (!entry.isDirectory()) continue;
      const childPath = path.join(dir, entry.name);
      const info = await readProjectInfo(childPath);
      if (info) children.push({ path: childPath, name: entry.name, projectName: info.name, projectId: info.id });
    }
  }
  return { exists: true, empty: visible.length === 0, project, children };
}

/**
 * Creates (or reuses an empty) subfolder named after the project.
 * @param {unknown} parent
 * @param {unknown} name
 */
async function createSubfolder(parent, name) {
  const base = await checkFolder(parent);
  const clean =
    String(name ?? '')
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

/**
 * @param {string} file
 * @param {string} relativePath
 * @returns {Promise<ShareFileInfo | null>}
 */
async function fileInfo(file, relativePath) {
  try {
    const stat = await fsp.stat(file);
    return stat.isFile() ? { path: relativePath, mtimeMs: stat.mtimeMs, size: stat.size } : null;
  } catch {
    return null; // just deleted or locked; picked up next time
  }
}

/** @param {unknown} folder */
async function list(folder) {
  const dir = await checkFolder(folder);
  await fsp.access(dir); // a missing folder (drive disconnected ...) makes the UI report "offline"
  const relativePaths = ['project.json'];
  for (const entityDir of ENTITY_DIRS) {
    try {
      for (const name of await fsp.readdir(path.join(dir, entityDir))) relativePaths.push(`${entityDir}/${name}`);
    } catch {
      // no such entity folder yet
    }
  }
  /** @type {ShareFileInfo[]} */
  const result = [];
  for (const relativePath of relativePaths) {
    if (!FILE_PATTERN.test(relativePath)) continue;
    const info = await fileInfo(path.join(dir, ...relativePath.split('/')), relativePath);
    if (info) result.push(info);
  }
  return result;
}

/**
 * @param {unknown} folder
 * @param {unknown} relativePath
 */
async function read(folder, relativePath) {
  const file = await filePath(folder, relativePath);
  try {
    return await fsp.readFile(file, 'utf8');
  } catch (err) {
    // missing or currently locked by the cloud service; retried next time
    const code = errorCode(err);
    if (code === 'ENOENT' || (typeof code === 'string' && LOCKED_CODES.has(code))) return null;
    throw err;
  }
}

/**
 * @param {unknown} folder
 * @param {string} relativePath
 * @param {unknown} content
 * @returns {Promise<ShareFileInfo>}
 */
async function write(folder, relativePath, content) {
  if (typeof content !== 'string') throw new Error(t('share.invalidContent'));
  const target = await filePath(folder, relativePath);
  await writeFileAtomic(target, content);
  const stat = await fsp.stat(target);
  return { path: relativePath, mtimeMs: stat.mtimeMs, size: stat.size };
}

/* ------------------------------------------------------------------ watching */

/** @typedef {{ sender: Electron.WebContents, timer: NodeJS.Timeout | undefined, watcher: fs.FSWatcher }} WatchEntry */

/** @type {Map<string, WatchEntry>} */
const watchers = new Map();

/**
 * Watches a shared folder and tells `sender` about changes. Returns false if the folder cannot be watched;
 * the UI then polls by itself.
 *
 * @param {Electron.WebContents} sender
 * @param {unknown} folder
 */
async function watch(sender, folder) {
  const dir = await checkFolder(folder);
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
    /** @type {WatchEntry} */
    const entry = { sender, timer: undefined, watcher };
    watcher.on('error', () => unwatch(dir));
    watchers.set(dir, entry);
    return true;
  } catch {
    return false;
  }
}

/** @param {unknown} folder */
function unwatch(folder) {
  if (typeof folder !== 'string') return;
  const dir = path.resolve(folder);
  const entry = watchers.get(dir);
  if (!entry) return;
  clearTimeout(entry.timer);
  entry.watcher.close();
  watchers.delete(dir);
}

/* ------------------------------------------------------------------ IPC */

function registerShareHandlers() {
  handle('share:choose-folder', async (event, purpose) => {
    if (testHooks.shareDir) {
      await fsp.mkdir(testHooks.shareDir, { recursive: true });
      return allowRoot(testHooks.shareDir);
    }
    const join = purpose === 'join';
    const window = BrowserWindow.fromWebContents(event.sender);
    /** @type {Electron.OpenDialogOptions} */
    const options = {
      title: join ? t('share.chooseJoinFolder') : t('share.chooseShareFolder'),
      buttonLabel: join ? t('share.open') : t('share.shareHere'),
      properties: ['openDirectory', 'createDirectory'],
    };
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    return allowRoot(result.filePaths[0]);
  });
  handle('share:inspect', (_event, folder) => inspect(folder));
  handle('share:create-subfolder', (_event, parent, name) => createSubfolder(parent, name));
  handle('share:list', (_event, folder) => list(folder));
  handle('share:read', (_event, folder, relativePath) => read(folder, relativePath));
  handle('share:write', (_event, folder, relativePath, content) => write(folder, relativePath, content));
  handle('share:watch', (event, folder) => watch(event.sender, folder));
  handle('share:unwatch', (_event, folder) => unwatch(folder));
  handle('share:open-folder', async (_event, folder) => openPath(await checkFolder(folder)));
  handle('share:user-name', () => {
    try {
      return os.userInfo().username || '';
    } catch {
      return '';
    }
  });
}

module.exports = { registerShareHandlers };
