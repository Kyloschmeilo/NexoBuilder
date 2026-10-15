/**
 * File access for shared projects (folders in OneDrive, Google Drive, Dropbox ...).
 *
 * The UI may only use folders the user picked in the dialog themselves
 * (remembered in <AppData>/shared-folders.json), and within them only the files of a shared
 * project: project.json, LIESMICH.txt, folders/*.json, items/*.json, glyphs/*.json, sounds/*.json, paintings/*.json.
 */
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const fsp = fs.promises;
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const FILE_PATTERN = /^(project\.json|LIESMICH\.txt|(folders|items|glyphs|sounds|paintings)\/[A-Za-z0-9_-]{1,64}\.json)$/;
const ENTITY_DIRS = ['folders', 'items', 'glyphs', 'sounds', 'paintings'];
const IGNORED_NAMES = new Set(['desktop.ini', 'Thumbs.db', '.DS_Store']);

/* ------------------------------------------------------------------ allowed folders */

let roots = null;

function rootsFile() {
  return path.join(app.getPath('userData'), 'shared-folders.json');
}

function loadRoots() {
  if (roots) return roots;
  try {
    const data = JSON.parse(fs.readFileSync(rootsFile(), 'utf8'));
    roots = Array.isArray(data) ? data.filter((r) => typeof r === 'string') : [];
  } catch {
    roots = [];
  }
  return roots;
}

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

function checkFolder(folder) {
  if (typeof folder !== 'string' || !folder) throw new Error('Ungültiger Ordner');
  const resolved = path.resolve(folder);
  const allowed = loadRoots().some((root) => resolved === root || resolved.startsWith(root.endsWith(path.sep) ? root : root + path.sep));
  if (!allowed) throw new Error('Dieser Ordner wurde nicht zum Teilen ausgewählt');
  return resolved;
}

function filePath(folder, rel) {
  if (typeof rel !== 'string' || !FILE_PATTERN.test(rel)) throw new Error(`Ungültige Datei: ${rel}`);
  return path.join(checkFolder(folder), ...rel.split('/'));
}

/* ------------------------------------------------------------------ files */

async function readProjectInfo(dir) {
  try {
    const env = JSON.parse(await fsp.readFile(path.join(dir, 'project.json'), 'utf8'));
    if (env && env.format === 'resourcepackbuilder-share' && env.data && typeof env.data.id === 'string') {
      return { id: env.data.id, name: String(env.data.name ?? '') };
    }
  } catch {
    // missing or incomplete project file
  }
  return null;
}

async function inspect(folder) {
  const dir = checkFolder(folder);
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return { exists: false, empty: true, project: null, children: [] };
    throw err;
  }
  const visible = entries.filter((e) => !e.name.startsWith('.') && !IGNORED_NAMES.has(e.name));
  const project = await readProjectInfo(dir);
  const children = [];
  if (!project) {
    for (const entry of visible) {
      if (!entry.isDirectory()) continue;
      const info = await readProjectInfo(path.join(dir, entry.name));
      if (info) children.push({ path: path.join(dir, entry.name), name: entry.name, projectName: info.name, projectId: info.id });
    }
  }
  return { exists: true, empty: visible.length === 0, project, children };
}

async function createSubfolder(parent, name) {
  const base = checkFolder(parent);
  const clean =
    String(name ?? '')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/[. ]+$/g, '')
      .trim()
      .slice(0, 80) || 'ResourcepackBuilder-Projekt';
  let candidate = path.join(base, clean);
  for (let n = 2; fs.existsSync(candidate) && (await fsp.readdir(candidate)).length > 0; n++) {
    candidate = path.join(base, `${clean} (${n})`);
  }
  await fsp.mkdir(candidate, { recursive: true });
  return candidate;
}

async function list(folder) {
  const dir = checkFolder(folder);
  await fsp.access(dir); // if the folder is missing (drive disconnected ...), the UI reports "offline"
  const result = [];
  const add = async (rel) => {
    try {
      const stat = await fsp.stat(path.join(dir, ...rel.split('/')));
      if (stat.isFile()) result.push({ path: rel, mtimeMs: stat.mtimeMs, size: stat.size });
    } catch {
      // just deleted or locked; picked up next time
    }
  };
  await add('project.json');
  for (const sub of ENTITY_DIRS) {
    let names;
    try {
      names = await fsp.readdir(path.join(dir, sub));
    } catch {
      continue;
    }
    for (const name of names) {
      const rel = `${sub}/${name}`;
      if (FILE_PATTERN.test(rel)) await add(rel);
    }
  }
  return result;
}

async function read(folder, rel) {
  try {
    return await fsp.readFile(filePath(folder, rel), 'utf8');
  } catch (err) {
    // missing or currently locked by the cloud service; retry next time
    if (['ENOENT', 'EBUSY', 'EPERM', 'EACCES'].includes(err.code)) return null;
    throw err;
  }
}

/** Writes to a temporary file first and then renames it, so nobody reads half-written files. */
async function write(folder, rel, content) {
  if (typeof content !== 'string') throw new Error('Ungültiger Inhalt');
  const target = filePath(folder, rel);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const tmp = path.join(path.dirname(target), `.${path.basename(target)}.${crypto.randomBytes(4).toString('hex')}.tmp`);
  await fsp.writeFile(tmp, content, 'utf8');
  for (let attempt = 0; ; attempt++) {
    try {
      await fsp.rename(tmp, target);
      break;
    } catch (err) {
      // Windows: target briefly locked (cloud service, virus scanner, another instance is reading)
      if (attempt >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) {
        await fsp.rm(tmp, { force: true });
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 80 * (attempt + 1)));
    }
  }
  const stat = await fsp.stat(target);
  return { path: rel, mtimeMs: stat.mtimeMs, size: stat.size };
}

/* ------------------------------------------------------------------ watching */

const watchers = new Map();

function watch(sender, folder) {
  const dir = checkFolder(folder);
  const existing = watchers.get(dir);
  if (existing) {
    existing.sender = sender;
    return true;
  }
  try {
    const entry = { sender, timer: null, watcher: null };
    entry.watcher = fs.watch(dir, { recursive: true }, (_event, filename) => {
      if (filename && String(filename).endsWith('.tmp')) return;
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => {
        if (!entry.sender.isDestroyed()) entry.sender.send('share:changed', dir);
      }, 250);
    });
    entry.watcher.on('error', () => unwatch(dir));
    watchers.set(dir, entry);
    return true;
  } catch {
    return false; // without watching, the UI polls periodically itself
  }
}

function unwatch(folder) {
  const dir = path.resolve(folder);
  const entry = watchers.get(dir);
  if (!entry) return;
  clearTimeout(entry.timer);
  try {
    entry.watcher.close();
  } catch {
    // already closed
  }
  watchers.delete(dir);
}

/* ------------------------------------------------------------------ IPC */

function registerShareHandlers() {
  // Only accept requests from our own app UI
  const handle = (channel, fn) =>
    ipcMain.handle(channel, (event, ...args) => {
      const url = event.senderFrame?.url ?? '';
      if (!url.startsWith('app://bundle/')) throw new Error('Not allowed');
      return fn(event, ...args);
    });

  handle('share:choose-folder', async (event, purpose) => {
    // Automated tests only: preset the folder without a dialog
    const testDir = process.env.RESOURCEPACKBUILDER_TEST_SHARE_DIR;
    if (testDir) {
      await fsp.mkdir(testDir, { recursive: true });
      return allowRoot(testDir);
    }
    const join = purpose === 'join';
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: join ? 'Ordner mit dem geteilten Projekt wählen' : 'Ordner zum Teilen wählen (z.B. in OneDrive)',
      buttonLabel: join ? 'Öffnen' : 'Hier teilen',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return allowRoot(result.filePaths[0]);
  });
  handle('share:inspect', (_event, folder) => inspect(folder));
  handle('share:create-subfolder', (_event, parent, name) => createSubfolder(parent, name));
  handle('share:list', (_event, folder) => list(folder));
  handle('share:read', (_event, folder, rel) => read(folder, rel));
  handle('share:write', (_event, folder, rel, content) => write(folder, rel, content));
  handle('share:watch', (event, folder) => watch(event.sender, folder));
  handle('share:unwatch', (_event, folder) => unwatch(folder));
  handle('share:open-folder', async (_event, folder) => {
    const error = await shell.openPath(checkFolder(folder));
    if (error) throw new Error(error);
  });
  handle('share:user-name', () => {
    try {
      return os.userInfo().username || '';
    } catch {
      return '';
    }
  });
}

module.exports = { registerShareHandlers };
