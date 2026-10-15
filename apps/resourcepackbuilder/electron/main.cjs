/**
 * ResourcepackBuilder as a desktop program (Electron).
 * Loads the static Next.js export (out/) via the custom app:// protocol in its own window.
 * Projects are saved automatically, just like in the browser (IndexedDB in the app data folder).
 */
const { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { onLocaleChange, setLocale, t } = require('./messages.cjs');
const { registerShareHandlers } = require('./share.cjs');
const { isTestServerRunning, registerTestServerHandlers, stopTestServer } = require('./testserver.cjs');

const APP_NAME = 'ResourcepackBuilder';
const OUT_DIR = path.join(__dirname, '..', 'out');
const APP_ORIGIN = 'app://bundle';
const ICON = path.join(__dirname, '..', 'build', 'icon.png');

app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId('de.resourcepackbuilder.app');

// Next.js loads its assets from absolute paths (/_next/...), which file:// cannot serve.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const { host, pathname } = new URL(request.url);
    const relative = decodeURIComponent(pathname).replace(/\/+$/, '') || '/index';
    const file = path.normalize(path.join(OUT_DIR, relative));
    // Never serve anything outside the export folder
    if (host !== 'bundle' || !file.startsWith(OUT_DIR + path.sep)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(path.extname(file) ? file : file + '.html').toString());
  });
}

// Single instance only: a second launch brings the existing window to the front
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

function isExternalUrl(url) {
  return /^https?:\/\//i.test(url);
}

function createWindow() {
  mainWindow = new BrowserWindow({
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

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Open links (e.g. to the Nexo docs) in the default browser, no new app windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  // Never navigate away from the app (e.g. when a file is dropped onto the window)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url === mainWindow?.webContents.getURL()) return;
    event.preventDefault();
    if (isExternalUrl(url)) void shell.openExternal(url);
  });

  void mainWindow.loadURL(`${APP_ORIGIN}/`);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
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
        { label: t('menu.nexoDocs'), click: () => void shell.openExternal('https://docs.nexomc.com/') },
        { label: 'Blockbench', click: () => void shell.openExternal('https://www.blockbench.net/') },
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

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(() => {
  registerAppProtocol();
  buildMenu();
  // The UI reports its language on startup and on every change; menus are rebuilt in that language
  onLocaleChange(() => buildMenu());
  ipcMain.handle('app:set-locale', (event, locale) => {
    const url = event.senderFrame?.url ?? '';
    if (!url.startsWith('app://bundle/')) throw new Error('Not allowed');
    setLocale(locale);
  });
  registerShareHandlers();
  registerTestServerHandlers();

  // Save exports (ZIP) and project files via a "Save as" dialog
  session.defaultSession.on('will-download', (_event, item) => {
    // Automated tests only: save directly into a folder without a dialog
    if (process.env.RESOURCEPACKBUILDER_DOWNLOAD_DIR) {
      item.setSavePath(path.join(process.env.RESOURCEPACKBUILDER_DOWNLOAD_DIR, item.getFilename()));
      return;
    }
    item.setSaveDialogOptions({
      title: t('dialog.saveAs'),
      defaultPath: path.join(app.getPath('downloads'), item.getFilename()),
    });
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// If the test server is still running, stop it cleanly before quitting (saves the world)
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
