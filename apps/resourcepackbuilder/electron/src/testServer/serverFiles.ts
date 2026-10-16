/** Sets up the server folder before every start: EULA, server.properties, Paper settings and the Nexo plugin. */
import { DEFAULT_SERVER_PROPERTIES, EULA_TEXT, patchPaperGlobal, setProperty } from '@resourcepackbuilder/test-server';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { t } from '../i18n';
import { nexoDir, pluginStore, pluginsDir, serverDir } from './paths';
import { logInfo, state } from './state';

async function writeServerProperties() {
  const propertiesPath = path.join(serverDir(), 'server.properties');
  const properties = fs.existsSync(propertiesPath) ? await fsp.readFile(propertiesPath, 'utf8') : DEFAULT_SERVER_PROPERTIES;
  await fsp.writeFile(propertiesPath, setProperty(properties, 'server-port', String(state.config.port)));
}

/** Nexo needs some block updates off; Paper creates paper-global.yml on its first start. */
async function patchPaperSettings() {
  const paperGlobal = path.join(serverDir(), 'config', 'paper-global.yml');
  if (!fs.existsSync(paperGlobal)) return;
  const patched = patchPaperGlobal(await fsp.readFile(paperGlobal, 'utf8'));
  if (patched === null) return;
  await fsp.writeFile(paperGlobal, patched);
  logInfo(t('testServer.paperSettingsPatched'));
}

/** Exactly the selected Nexo version in plugins/. */
async function installNexoPlugin() {
  // The file name passed the settings check (no path separators), so it stays inside the plugin store
  const wanted = state.config.nexoJar?.file ?? null;
  for (const name of await fsp.readdir(pluginsDir())) {
    if (/^nexo.*\.jar$/i.test(name) && name !== wanted) await fsp.rm(path.join(pluginsDir(), name), { force: true });
  }
  if (!wanted) return;
  const source = path.join(pluginStore(), wanted);
  if (!fs.existsSync(source)) throw new Error(t('testServer.nexoJarMissing'));
  await fsp.copyFile(source, path.join(pluginsDir(), wanted));
}

export async function prepareServerFiles(): Promise<void> {
  await fsp.mkdir(pluginsDir(), { recursive: true });
  await fsp.writeFile(path.join(serverDir(), 'eula.txt'), EULA_TEXT);
  await writeServerProperties();
  await patchPaperSettings();
  // Cache of the obfuscated pack; can be corrupt after aborted runs
  for (const cache of [path.join(nexoDir(), 'pack', '.deobfCachedPacks'), path.join(nexoDir(), '.deobfCachedPacks')]) {
    await fsp.rm(cache, { recursive: true, force: true });
  }
  await installNexoPlugin();
}
