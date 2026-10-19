/**
 * ResourcepackBuilder as a desktop program (Electron).
 * Loads the static Next.js export (out/) via the custom app:// protocol in its own window.
 * Projects are stored by the UI, just like in the browser (IndexedDB in the app data folder); the main process adds
 * what a browser cannot do: shared folders (share.ts) and the local test server (testServer/).
 *
 * Bundled with esbuild into electron/dist/main.cjs (see electron/build.mjs).
 */
import { APP_HOST, APP_ORIGIN, APP_SCHEME } from '@resourcepackbuilder/desktop-contract';
import { app, BrowserWindow, dialog, Menu, nativeTheme, net, protocol, session, shell, type MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { flushBeforeClose, noteQuit, registerFlushHandler } from './flushOnClose';
import { setLocale, t } from './i18n';
import { handle } from './ipc';
import { registerShareHandlers } from './share';
import { testHooks } from './testHooks';
import { isTestServerActive, registerTestServerHandlers, stopTestServer } from './testServer';

const APP_NAME = 'ResourcepackBuilder';
/** The bundle lives in electron/dist/, next to the app's out/ and build/ folders. */
const APP_DIR = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(APP_DIR, 'out');
const ICON = path.join(APP_DIR, 'build', 'icon.png');
/**
 * `--canvas` of the default colour theme (Deepslate) in packages/ui/src/styles.css, light and dark, shown until the UI
 * has painted. A test keeps it in line with the stylesheet.
 */
const BACKGROUND = { light: '#e4e7eb', dark: '#0c0f13' };
/** Web permissions the UI needs: copy buttons write to the clipboard. Everything else is denied. */
const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write']);

let mainWindow: BrowserWindow | null = null;

// Next.js loads its assets from absolute paths (/_next/...), which file:// cannot serve.
protocol.registerSchemesAsPrivileged([{ scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, (request) => {
    const { host, pathname } = new URL(request.url);
    const relative = decodeURIComponent(pathname).replace(/\/+$/, '') || '/index';
    const file = path.normalize(path.join(OUT_DIR, relative));
    // Never serve anything outside the export folder
    if (host !== APP_HOST || !file.startsWith(OUT_DIR + path.sep)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(path.extname(file) ? file : `${file}.html`).toString());
  });
}

/** Opens https links (e.g. to the Nexo docs) in the default browser; anything else is ignored. */
function openExternal(url: string) {
  if (/^https:\/\//i.test(url)) void shell.openExternal(url);
}

const backgroundColor = () => (nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light);

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 640,
    title: APP_NAME,
    icon: ICON,
    backgroundColor: backgroundColor(),
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
  flushBeforeClose(window);

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
  const template: MenuItemConstructorOptions[] = [
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
        { label: t('menu.craftEngineDocs'), click: () => openExternal('https://xiao-momi.github.io/craft-engine-wiki/') },
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
  // A second launch brings the existing window to the front – or opens a new one, e.g. while the window was closed
  // and the test server is still shutting down
  app.on('second-instance', () => {
    if (!app.isReady()) return;
    if (!mainWindow) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    registerAppProtocol();
    denyPermissions();
    buildMenu();
    // The UI reports its language on startup and on every change; menus are rebuilt in that language
    handle('app:set-locale', (_event, locale) => {
      if (setLocale(locale)) buildMenu();
    });
    registerFlushHandler();
    registerShareHandlers();
    registerTestServerHandlers();
    handleDownloads();
    nativeTheme.on('updated', () => mainWindow?.setBackgroundColor(backgroundColor()));

    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // A running test server is stopped cleanly before quitting (saves the world)
  let quitting = false;
  app.on('before-quit', (event) => {
    if (quitting || !isTestServerActive()) {
      noteQuit();
      return;
    }
    event.preventDefault();
    quitting = true;
    const hadWindow = BrowserWindow.getAllWindows().length > 0;
    void stopTestServer().finally(() => {
      // The program was launched again while the server stopped after its last window had closed: keep running
      if (!hadWindow && BrowserWindow.getAllWindows().length > 0) quitting = false;
      else app.quit();
    });
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
