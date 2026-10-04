/**
 * NexoBuilder als Desktop-Programm (Electron).
 * Lädt die gebaute Einzeldatei-Version (dist-single/index.html) in einem eigenen Fenster.
 * Projekte werden – wie im Browser – automatisch gespeichert (IndexedDB im App-Datenordner).
 */
const { app, BrowserWindow, Menu, dialog, session, shell } = require('electron');
const path = require('node:path');

const APP_NAME = 'NexoBuilder';
const INDEX_HTML = path.join(__dirname, '..', 'dist-single', 'index.html');
const ICON = path.join(__dirname, '..', 'build', 'icon.png');

app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId('de.nexobuilder.app');

// Nur eine Instanz – ein zweiter Start holt das vorhandene Fenster nach vorne
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
    backgroundColor: '#15161c',
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Links (z.B. zur Nexo-Doku) im Standard-Browser öffnen, keine neuen App-Fenster
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  // Niemals von der App wegnavigieren (z.B. wenn eine Datei ins Fenster gezogen wird)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url === mainWindow?.webContents.getURL()) return;
    event.preventDefault();
    if (isExternalUrl(url)) void shell.openExternal(url);
  });

  void mainWindow.loadFile(INDEX_HTML);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: 'Datei',
      submenu: [{ role: 'quit', label: 'Beenden' }],
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload', label: 'Neu laden' },
        { role: 'toggleDevTools', label: 'Entwicklertools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Originalgröße' },
        { role: 'zoomIn', label: 'Vergrößern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
      ],
    },
    {
      label: 'Hilfe',
      submenu: [
        { label: 'Nexo-Dokumentation', click: () => void shell.openExternal('https://docs.nexomc.com/') },
        { label: 'Blockbench', click: () => void shell.openExternal('https://www.blockbench.net/') },
        { type: 'separator' },
        {
          label: `Über ${APP_NAME}`,
          click: () =>
            void dialog.showMessageBox({
              type: 'info',
              title: `Über ${APP_NAME}`,
              message: `${APP_NAME} ${app.getVersion()}`,
              detail:
                'Erstellt fertige Nexo-Items mit Resourcepack aus Blockbench-Modellen, Java-Modellen und Texturen.\n\n' +
                `Projekte werden automatisch gespeichert in:\n${app.getPath('userData')}`,
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
  buildMenu();

  // Exporte (ZIP) und Projektdateien über einen „Speichern unter“-Dialog sichern
  session.defaultSession.on('will-download', (_event, item) => {
    // Nur für automatische Tests: ohne Dialog direkt in einen Ordner speichern
    if (process.env.NEXOBUILDER_DOWNLOAD_DIR) {
      item.setSavePath(path.join(process.env.NEXOBUILDER_DOWNLOAD_DIR, item.getFilename()));
      return;
    }
    item.setSaveDialogOptions({
      title: 'Speichern unter',
      defaultPath: path.join(app.getPath('downloads'), item.getFilename()),
    });
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
