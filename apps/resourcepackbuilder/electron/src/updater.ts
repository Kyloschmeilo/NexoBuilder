/**
 * Automatic updates from the GitHub releases (electron-updater, configured by `publish` in electron-builder.yml).
 * The installed program looks for a new version on startup and downloads it in the background; once it is ready, a
 * dialog offers to restart now, otherwise it is installed when the program quits. "Check for updates" in the help menu
 * does the same on demand and also reports when there is nothing new or the check failed.
 *
 * Only the installed (NSIS) program updates itself: the portable exe, development runs and the e2e test do not.
 */
import { app, dialog } from 'electron';
import { autoUpdater, type UpdateInfo } from 'electron-updater';
import { flushWindows } from './flushOnClose';
import { t } from './i18n';
import { isTestServerActive, stopTestServer } from './testServer';

/** The portable exe sets this; it cannot replace itself. */
const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);

/** Whether this program can update itself. */
export const canUpdate = (): boolean => app.isPackaged && !isPortable && process.env.RESOURCEPACKBUILDER_E2E !== '1';

/** A check started from the menu is under way: its outcome is reported, also when there is no update. */
let isManualCheck = false;
let isChecking = false;
/** The version that was downloaded and waits for a restart. */
let downloaded: string | null = null;

/** Stops the test server and lets the UI write what is pending, then quits and runs the installer. */
async function restartAndInstall(): Promise<void> {
  if (isTestServerActive()) await stopTestServer();
  await flushWindows();
  // Silent install (the user already agreed), then start the new version
  autoUpdater.quitAndInstall(true, true);
}

async function offerRestart(version: string): Promise<void> {
  const { response } = await dialog.showMessageBox({
    type: 'info',
    title: t('updater.readyTitle'),
    message: t('updater.ready', { version }),
    detail: t('updater.readyDetail'),
    buttons: [t('updater.restart'), t('updater.later')],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) await restartAndInstall();
}

async function check(manual: boolean): Promise<void> {
  if (downloaded) {
    if (manual) await offerRestart(downloaded);
    return;
  }
  if (isChecking) return;
  isChecking = true;
  isManualCheck = manual;
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.error('Update check failed', err);
    if (manual) {
      void dialog.showMessageBox({
        type: 'error',
        title: t('updater.title'),
        message: t('updater.failed'),
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  } finally {
    isChecking = false;
  }
}

/** Looks for an update now and reports the outcome (help menu). */
export function checkForUpdatesManually(): void {
  if (canUpdate()) void check(true);
}

/** Sets up the updater and looks for an update in the background; does nothing where the program cannot update. */
export function initUpdater(): void {
  if (!canUpdate()) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-not-available', () => {
    if (!isManualCheck) return;
    void dialog.showMessageBox({
      type: 'info',
      title: t('updater.title'),
      message: t('updater.upToDate', { version: app.getVersion() }),
    });
  });
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    if (!isManualCheck) return;
    void dialog.showMessageBox({
      type: 'info',
      title: t('updater.title'),
      message: t('updater.downloading', { version: info.version }),
    });
  });
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    downloaded = info.version;
    void offerRestart(info.version);
  });
  autoUpdater.on('error', (err) => console.error('Update failed', err));

  void check(false);
}
