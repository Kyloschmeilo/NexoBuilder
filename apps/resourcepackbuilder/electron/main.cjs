// @ts-check
/**
 * ResourcepackBuilder as a desktop program (Electron).
 * Loads the static Next.js export (out/) via the custom app:// protocol in its own window.
 * Projects are saved automatically, just like in the browser (IndexedDB in the app data folder).
 */
const { app, BrowserWindow, Menu, dialog, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { onLocaleChange, setLocale, t } = require('./i18n.cjs');
const { APP_ORIGIN, handle } = require('./ipc.cjs');
const { registerShareHandlers } = require('./share.cjs');
const { testHooks } = require('./testHooks.cjs');
const { isTestServerRunning, registerTestServerHandlers, stopTestServer } = require('./testserver/index.cjs');

const APP_NAME = 'ResourcepackBuilder';
const OUT_DIR = path.join(__dirname, '..', 'out');
const ICON = path.join(__dirname, '..', 'build', 'icon.png');
/** Web permissions the UI needs: copy buttons write to the clipboard. Everything else is denied. */
const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write']);

/** @type {BrowserWindow | null} */
let mainWindow = null;

// Next.js loads its assets from absolute paths (/_next/...), which file:// cannot serve.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const { host, pathname } = new URL(request.url);
    const relative = decodeURIComponent(pathname).replace(/\/+$/, '') || '/index';
    const file = path.normalize(path.join(OUT_DIR, relative));
    // Never serve anything outside the export folder
    if (host !== 'bundle' || !file.startsWith(OUT_DIR + path.sep)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(path.extname(file) ? file : `${file}.html`).toString());
  });
}

/** Opens https links (e.g. to the Nexo docs) in the default browser; anything else is ignored. @param {string} url */
function openExternal(url) {
  if (/^https:\/\//i.test(url)) void shell.openExternal(url);
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 640,
    title: APP_NAME,
    icon: ICON,
    backgroundColor: '#0a1110',
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  mainWindow = window;

  window.once('ready-to-show', () => window.show());
  // No new app windows
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  // Never navigate away from the app (e.g. when a file is dropped onto the window)
  window.webContents.on('will-navigate', (event, url) => {
    if (url === window.webContents.getURL()) return;
    event.preventDefault();
    openExternal(url);
  });

  void window.loadURL(`${APP_ORIGIN}/`);
  window.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    {
      label: t('menu.file'),
      submenu: [{ role: 'quit', label: t('menu.quit') }],
    },
    {
      label: t('menu.view'),
      submenu: [
        { role: 'reload', label: t('menu.reload') },
        { role: 'toggleDevTools', label: t('menu.devTools') },
        { type: 'separator' },
        { role: 'resetZoom', label: t('menu.resetZoom') },
        { role: 'zoomIn', label: t('menu.zoomIn') },
        { role: 'zoomOut', label: t('menu.zoomOut') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('menu.fullscreen') },
      ],
    },
    {
      label: t('menu.help'),
      submenu: [
        { label: t('menu.nexoDocs'), click: () => openExternal('https://docs.nexomc.com/') },
        { label: 'Blockbench', click: () => openExternal('https://www.blockbench.net/') },
        { type: 'separator' },
        {
          label: t('menu.about', { app: APP_NAME }),
          click: () =>
            void dialog.showMessageBox({
              type: 'info',
              title: t('menu.about', { app: APP_NAME }),
              message: `${APP_NAME} ${app.getVersion()}`,
              detail: t('about.detail', { path: app.getPath('userData') }),
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/** Exports (ZIP) and project files are saved via a "Save as" dialog. */
function handleDownloads() {
  session.defaultSession.on('will-download', (_event, item) => {
    if (testHooks.downloadDir) {
      item.setSavePath(path.join(testHooks.downloadDir, item.getFilename()));
      return;
    }
    item.setSaveDialogOptions({
      title: t('dialog.saveAs'),
      defaultPath: path.join(app.getPath('downloads'), item.getFilename()),
    });
  });
}

function denyPermissions() {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(ALLOWED_PERMISSIONS.has(permission)));
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => ALLOWED_PERMISSIONS.has(permission));
}

function run() {
  // A second launch brings the existing window to the front
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    registerAppProtocol();
    denyPermissions();
    buildMenu();
    // The UI reports its language on startup and on every change; menus are rebuilt in that language
    onLocaleChange(() => buildMenu());
    handle('app:set-locale', (_event, locale) => setLocale(locale));
    registerShareHandlers();
    registerTestServerHandlers();
    handleDownloads();

    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // A running test server is stopped cleanly before quitting (saves the world)
  let quitting = false;
  app.on('before-quit', (event) => {
    if (quitting || !isTestServerRunning()) return;
    event.preventDefault();
    quitting = true;
    void stopTestServer().finally(() => app.quit());
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// Before the single-instance lock: the name decides the user data folder, where the lock lives
app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId('de.resourcepackbuilder.app');

// Single instance only: a second process hands over to the first one and quits without setting anything up
if (app.requestSingleInstanceLock()) run();
else app.quit();
