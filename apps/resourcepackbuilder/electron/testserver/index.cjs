// @ts-check
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
const { BrowserWindow } = require('electron');
const fsp = require('node:fs/promises');
const { openPath } = require('../fsUtil.cjs');
const { handle } = require('../ipc.cjs');
const { chooseNexoJar } = require('./nexoJar.cjs');
const { paperVersions } = require('./paper.cjs');
const { serverDir } = require('./paths.cjs');
const { isRunning, requestReload, runUserCommand, start, stop } = require('./server.cjs');
const { clearLog, loadConfig, publicState, snapshot, updateConfig } = require('./state.cjs');
const { readNexoSettings, syncFiles } = require('./sync.cjs');

/** Like `handle`, but waits until the saved settings are loaded. */
/** @type {typeof handle} */
const handleLoaded = (channel, fn) =>
  handle(channel, async (event, ...args) => {
    await loadConfig();
    return fn(event, ...args);
  });

function registerTestServerHandlers() {
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

module.exports = { registerTestServerHandlers, stopTestServer: stop, isTestServerRunning: isRunning };
