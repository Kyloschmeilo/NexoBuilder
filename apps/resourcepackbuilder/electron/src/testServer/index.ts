/**
 * Local test server (Paper + the pack target's plugin: Nexo or CraftEngine).
 *
 * - downloads Paper (PaperMC) and, if needed, Java (Eclipse Temurin)
 * - sets up the target's server (EULA only after consent, server.properties, the plugin)
 * - starts it as a child process and forwards the console to the UI
 * - writes the project files to the plugin folder (e.g. plugins/Nexo) and then reloads the plugin
 *
 * Everything lives in <userData>/testserver, with one server folder per target. The user brings their own Nexo JAR;
 * it is only copied into this folder, never redistributed.
 */
import type { DesktopInvokeChannel } from '@resourcepackbuilder/desktop-contract';
import { BrowserWindow } from 'electron';
import fsp from 'node:fs/promises';
import { openPath } from '../fileHelpers';
import { handle, type Handler } from '../ipc';
import { DEFAULT_PACK_TARGET } from '@resourcepackbuilder/core/project';
import { DesktopError } from '@resourcepackbuilder/desktop-contract';
import { isConfigLocked } from '@resourcepackbuilder/test-server';
import { paperVersions } from './paper';
import { serverDir } from './paths';
import { choosePluginJar, downloadPlugin } from './pluginJar';
import { isActive, isRunning, requestReload, runUserCommand, start, stop } from './server';
import { clearLog, loadConfig, publicState, snapshot, state, updateConfig } from './state';
import { readPluginConfig, syncFiles } from './sync';
import { stopOrphanedServers } from './orphan';
import { deleteWorld } from './world';

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
  handleLoaded('testserver:choose-plugin-jar', (event, target) => choosePluginJar(BrowserWindow.fromWebContents(event.sender), target));
  handleLoaded('testserver:download-plugin', (_event, target) => downloadPlugin(target));
  handleLoaded('testserver:start', (_event, target) => start(target));
  handleLoaded('testserver:stop', async () => {
    await stop();
    return publicState();
  });
  handleLoaded('testserver:command', (_event, command) => runUserCommand(command));
  handleLoaded('testserver:reload', () => requestReload());
  handleLoaded('testserver:sync', (_event, files, options) => syncFiles(files, options));
  handleLoaded('testserver:read-plugin-config', (_event, target) => readPluginConfig(target));
  handleLoaded('testserver:open-folder', async () => {
    // The folder of the server that runs (or ran last)
    const dir = serverDir(state.target ?? DEFAULT_PACK_TARGET);
    await fsp.mkdir(dir, { recursive: true });
    await openPath(dir);
  });
  handleLoaded('testserver:reset-world', async (_event, target) => {
    if (isRunning() || isConfigLocked(state.status)) throw new DesktopError('serverRunning');
    // A server left running by a crash holds the world open
    await stopOrphanedServers();
    await deleteWorld(target);
  });
  handleLoaded('testserver:clear-log', () => {
    clearLog();
    return true;
  });
}

export { isActive as isTestServerActive, stop as stopTestServer };
