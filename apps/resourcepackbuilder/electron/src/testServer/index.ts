/**
 * Local test server (Paper + Nexo).
 *
 * - downloads Paper (PaperMC) and, if needed, Java (Eclipse Temurin)
 * - sets up the server (EULA only after consent, server.properties, Nexo plugin)
 * - starts it as a child process and forwards the console to the UI
 * - writes the project files to plugins/Nexo and then reloads Nexo
 *
 * Everything lives in <userData>/testserver. The user brings their own Nexo JAR; it is only copied into this folder,
 * never redistributed.
 */
import type { DesktopInvokeChannel } from '@resourcepackbuilder/desktop-contract';
import { BrowserWindow } from 'electron';
import fsp from 'node:fs/promises';
import { openPath } from '../fileHelpers';
import { handle, type Handler } from '../ipc';
import { chooseNexoJar } from './nexoJar';
import { paperVersions } from './paper';
import { serverDir } from './paths';
import { isRunning, requestReload, runUserCommand, start, stop } from './server';
import { clearLog, loadConfig, publicState, snapshot, updateConfig } from './state';
import { readNexoSettings, syncFiles } from './sync';

/** Like `handle`, but waits until the saved settings are loaded. */
function handleLoaded<C extends DesktopInvokeChannel>(channel: C, fn: Handler<C>) {
  handle(channel, async (event, ...args) => {
    await loadConfig();
    return fn(event, ...args);
  });
}

export function registerTestServerHandlers(): void {
  handleLoaded('testserver:get-state', () => snapshot());
  handleLoaded('testserver:set-config', (_event, patch) => updateConfig(patch));
  handleLoaded('testserver:versions', () => paperVersions());
  handleLoaded('testserver:choose-nexo-jar', (event) => chooseNexoJar(BrowserWindow.fromWebContents(event.sender)));
  handleLoaded('testserver:start', () => start());
  handleLoaded('testserver:stop', async () => {
    await stop();
    return publicState();
  });
  handleLoaded('testserver:command', (_event, command) => runUserCommand(command));
  handleLoaded('testserver:reload', () => requestReload());
  handleLoaded('testserver:sync', (_event, files, options) => syncFiles(files, options));
  handleLoaded('testserver:read-settings', () => readNexoSettings());
  handleLoaded('testserver:open-folder', async () => {
    await fsp.mkdir(serverDir(), { recursive: true });
    await openPath(serverDir());
  });
  handleLoaded('testserver:clear-log', () => {
    clearLog();
    return true;
  });
}

export { isRunning as isTestServerRunning, stop as stopTestServer };
