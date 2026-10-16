/** The user's Nexo plugin JAR: picked once, checked, and kept in the test server's plugin store. */
import { nexoJarFileName } from '@resourcepackbuilder/core/testServer/config';
import { readPluginDescriptor } from '@resourcepackbuilder/core/testServer/pluginJar';
import { DesktopError, type NexoJarInfo } from '@resourcepackbuilder/desktop-contract';
import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { t } from '../i18n';
import { testHooks } from '../testHooks';
import { pluginStore } from './paths';
import { logInfo, saveConfig, setState, state } from './state';

/** Asks for the Nexo JAR, checks it and copies it into the plugin store. */
export async function chooseNexoJar(window: BrowserWindow | null): Promise<NexoJarInfo | null> {
  let source = testHooks.nexoJar;
  if (!source) {
    const options: OpenDialogOptions = {
      title: t('testServer.chooseNexoJar'),
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
  if (plugin.name.toLowerCase() !== 'nexo') throw new DesktopError('notNexo', { name: plugin.name });
  const file = nexoJarFileName(plugin.version);
  await fsp.rm(pluginStore(), { recursive: true, force: true });
  await fsp.mkdir(pluginStore(), { recursive: true });
  await fsp.writeFile(path.join(pluginStore(), file), buffer);
  const nexoJar = { file, name: plugin.name.slice(0, 200), version: plugin.version.slice(0, 200) };
  state.config = { ...state.config, nexoJar };
  await saveConfig();
  setState();
  logInfo(t('testServer.nexoSelected', { version: plugin.version }));
  return nexoJar;
}
