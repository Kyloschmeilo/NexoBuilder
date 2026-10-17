/** Sets up a target's server folder before every start: EULA, server.properties, Paper settings and the plugin. */
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import {
  DEFAULT_SERVER_PROPERTIES,
  EULA_TEXT,
  INSTALLED_PLUGIN_JAR_PATTERNS,
  missingBundledFiles,
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

/** Restores the packs the plugin ships in its JAR that are missing on the server (see `ServerAdapter.bundledFolder`). */
async function restoreBundledPacks(target: PackTargetId) {
  const adapter = serverAdapterFor(target);
  const jarFile = state.config.pluginJars[target]?.file;
  if (!adapter.bundledFolder || !jarFile) return;
  const folder = path.join(pluginDir(target), ...adapter.bundledFolder.split('/'));
  const existing = fs.existsSync(folder) ? (await fsp.readdir(folder, { withFileTypes: true })).filter((e) => e.isDirectory()) : [];
  const files = await missingBundledFiles(
    await fsp.readFile(path.join(pluginStore(target), jarFile)),
    adapter.bundledFolder,
    new Set(existing.map((entry) => entry.name)),
  );
  for (const file of files) {
    const destination = path.join(folder, ...file.path.split('/'));
    await fsp.mkdir(path.dirname(destination), { recursive: true });
    await fsp.writeFile(destination, file.data);
  }
  const packs = [...new Set(files.map((file) => file.path.split('/')[0]))];
  if (packs.length > 0) logInfo(t('testServer.bundledPacksRestored', { plugin: adapter.pluginName, packs: packs.join(', ') }));
}

/**
 * A plugin that builds no pack on startup gets the app's reload right after "Done", before the renderer patches the
 * plugin config (which the plugin only creates on its first start). So a missing config is written here already;
 * CraftEngine needs `forced-locale: en` from it to log the English lines the app reads.
 */
async function seedPluginConfig(target: PackTargetId) {
  const adapter = serverAdapterFor(target);
  if (adapter.buildsPackOnStart) return;
  const configPath = path.join(pluginDir(target), ...adapter.configFile.split('/'));
  await fsp.mkdir(path.dirname(configPath), { recursive: true });
  try {
    // 'wx' never overwrites a config that is already there
    await fsp.writeFile(configPath, adapter.patchConfig(null, { packPort: state.config.packPort }), { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
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
  await restoreBundledPacks(target);
  await seedPluginConfig(target);
}
