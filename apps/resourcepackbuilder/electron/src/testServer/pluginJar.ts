/** A target's plugin JAR: picked once, checked, and kept in the test server's plugin store of that target. */
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { pluginJarFileName, readPluginDescriptor, serverAdapterFor } from '@resourcepackbuilder/test-server';
import { DesktopError, type PluginJarInfo } from '@resourcepackbuilder/desktop-contract';
import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { t } from '../i18n';
import { testHooks } from '../testHooks';
import { pluginStore } from './paths';
import { logInfo, saveConfig, setState, state } from './state';

/** Asks for the target's plugin JAR, checks it and copies it into the target's plugin store. */
export async function choosePluginJar(window: BrowserWindow | null, target: PackTargetId): Promise<PluginJarInfo | null> {
  const adapter = serverAdapterFor(target);
  let source = target === 'nexo' ? testHooks.nexoJar : null;
  if (!source) {
    const options: OpenDialogOptions = {
      title: t('testServer.choosePluginJar', { plugin: adapter.pluginName }),
      buttonLabel: t('testServer.choose'),
      filters: [{ name: t('testServer.pluginFilter'), extensions: ['jar'] }],
      properties: ['openFile'],
    };
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    source = result.filePaths[0];
  }
  const buffer = await fsp.readFile(source);
  const plugin = await readPluginDescriptor(buffer);
  if (!plugin) throw new DesktopError('notAPlugin');
  if (plugin.name.toLowerCase() !== adapter.jar.descriptorName.toLowerCase()) {
    throw new DesktopError('wrongPlugin', { name: plugin.name, plugin: adapter.pluginName });
  }
  const file = pluginJarFileName(target, plugin.version);
  const store = pluginStore(target);
  await fsp.rm(store, { recursive: true, force: true });
  await fsp.mkdir(store, { recursive: true });
  await fsp.writeFile(path.join(store, file), buffer);
  const jar = { file, name: plugin.name.slice(0, 200), version: plugin.version.slice(0, 200) };
  state.config = { ...state.config, pluginJars: { ...state.config.pluginJars, [target]: jar } };
  await saveConfig();
  setState();
  logInfo(t('testServer.pluginSelected', { plugin: adapter.pluginName, version: plugin.version }));
  return jar;
}

/** Downloads the target's plugin JAR. Not available for any target yet (CraftEngine's Modrinth download follows). */
export async function downloadPlugin(target: PackTargetId): Promise<PluginJarInfo> {
  throw new DesktopError('pluginDownloadUnsupported', { plugin: serverAdapterFor(target).pluginName });
}
