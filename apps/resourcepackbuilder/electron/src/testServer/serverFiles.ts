/** Sets up a target's server folder before every start: EULA, server.properties, Paper settings and the plugin. */
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import {
  DEFAULT_SERVER_PROPERTIES,
  EULA_TEXT,
  INSTALLED_PLUGIN_JAR_PATTERNS,
  patchPaperGlobal,
  serverAdapterFor,
  setProperty,
} from '@resourcepackbuilder/test-server';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { t } from '../i18n';
import { pluginDir, pluginStore, pluginsDir, serverDir } from './paths';
import { logInfo, state } from './state';

async function writeServerProperties(target: PackTargetId) {
  const propertiesPath = path.join(serverDir(target), 'server.properties');
  const properties = fs.existsSync(propertiesPath) ? await fsp.readFile(propertiesPath, 'utf8') : DEFAULT_SERVER_PROPERTIES;
  await fsp.writeFile(propertiesPath, setProperty(properties, 'server-port', String(state.config.port)));
}

/** Settings the plugin needs in paper-global.yml (Nexo: some block updates off); Paper creates it on its first start. */
async function patchPaperSettings(target: PackTargetId) {
  const paperGlobal = path.join(serverDir(target), 'config', 'paper-global.yml');
  if (!fs.existsSync(paperGlobal)) return;
  const adapter = serverAdapterFor(target);
  const patched = patchPaperGlobal(await fsp.readFile(paperGlobal, 'utf8'), adapter.paperGlobalOverrides);
  if (patched === null) return;
  await fsp.writeFile(paperGlobal, patched);
  logInfo(t('testServer.paperSettingsPatched', { plugin: adapter.pluginName }));
}

/** Exactly the selected plugin version in plugins/. */
async function installPlugin(target: PackTargetId) {
  // The file name passed the settings check (no path separators), so it stays inside the plugin store
  const wanted = state.config.pluginJars[target]?.file ?? null;
  const plugins = pluginsDir(target);
  for (const name of await fsp.readdir(plugins)) {
    if (INSTALLED_PLUGIN_JAR_PATTERNS[target].test(name) && name !== wanted) await fsp.rm(path.join(plugins, name), { force: true });
  }
  if (!wanted) return;
  const source = path.join(pluginStore(target), wanted);
  if (!fs.existsSync(source)) throw new Error(t('testServer.pluginJarMissing', { plugin: serverAdapterFor(target).pluginName }));
  await fsp.copyFile(source, path.join(pluginsDir(target), wanted));
}

export async function prepareServerFiles(target: PackTargetId): Promise<void> {
  await fsp.mkdir(pluginsDir(target), { recursive: true });
  await fsp.writeFile(path.join(serverDir(target), 'eula.txt'), EULA_TEXT);
  await writeServerProperties(target);
  await patchPaperSettings(target);
  for (const cache of serverAdapterFor(target).cachesToClear) {
    await fsp.rm(path.join(pluginDir(target), ...cache.split('/')), { recursive: true, force: true });
  }
  await installPlugin(target);
}
