/** A target's plugin JAR: picked once, checked, and kept in the test server's plugin store of that target. */
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { pluginJarFileName, readPluginDescriptor, serverAdapterFor, type PluginDescriptor } from '@resourcepackbuilder/test-server';
import { DesktopError, type PluginJarInfo } from '@resourcepackbuilder/desktop-contract';
import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { t } from '../i18n';
import { testHooks } from '../testHooks';
import { downloadCraftEngine } from './modrinth';
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
  return storePluginJar(target, await fsp.readFile(source));
}

/** The JAR's plugin descriptor; an error unless it is the target's plugin. */
async function checkPluginJar(target: PackTargetId, jar: Uint8Array): Promise<PluginDescriptor> {
  const adapter = serverAdapterFor(target);
  const plugin = await readPluginDescriptor(jar);
  if (!plugin) throw new DesktopError('notAPlugin');
  if (plugin.name.toLowerCase() !== adapter.jar.descriptorName.toLowerCase()) {
    throw new DesktopError('wrongPlugin', { name: plugin.name, plugin: adapter.pluginName });
  }
  return plugin;
}

/** Checks the JAR, makes it the only one in the target's plugin store and records it in the settings. */
async function storePluginJar(target: PackTargetId, jar: Uint8Array): Promise<PluginJarInfo> {
  const plugin = await checkPluginJar(target, jar);
  const file = pluginJarFileName(target, plugin.version);
  const store = pluginStore(target);
  await fsp.rm(store, { recursive: true, force: true });
  await fsp.mkdir(store, { recursive: true });
  await fsp.writeFile(path.join(store, file), jar);
  const info = { file, name: plugin.name.slice(0, 200), version: plugin.version.slice(0, 200) };
  state.config = { ...state.config, pluginJars: { ...state.config.pluginJars, [target]: info } };
  await saveConfig();
  setState();
  logInfo(t('testServer.pluginSelected', { plugin: serverAdapterFor(target).pluginName, version: plugin.version }));
  return info;
}

/** Downloads the target's plugin JAR (CraftEngine from Modrinth); Nexo has no download. */
export async function downloadPlugin(target: PackTargetId): Promise<PluginJarInfo> {
  const adapter = serverAdapterFor(target);
  if (adapter.jar.kind !== 'modrinth') throw new DesktopError('pluginDownloadUnsupported', { plugin: adapter.pluginName });
  return storePluginJar(target, await downloadCraftEngine());
}
