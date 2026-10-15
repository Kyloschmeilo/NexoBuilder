// @ts-check
/** Sets up the server folder before every start: EULA, server.properties, Paper settings and the Nexo plugin. */
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const { t } = require('../i18n.cjs');
const { nexoDir, pluginStore, pluginsDir, serverDir } = require('./paths.cjs');
const { info, state } = require('./state.cjs');

const DEFAULT_PROPERTIES = [
  '# Created by the ResourcepackBuilder test server – feel free to adjust',
  'motd=ResourcepackBuilder test server',
  'server-port=25565',
  'online-mode=true',
  'gamemode=creative',
  'difficulty=peaceful',
  'level-type=minecraft\\:flat',
  'generator-settings={"biome"\\:"minecraft\\:plains","layers"\\:[{"block"\\:"minecraft\\:bedrock","height"\\:1},{"block"\\:"minecraft\\:dirt","height"\\:2},{"block"\\:"minecraft\\:grass_block","height"\\:1}]}',
  'generate-structures=false',
  'spawn-protection=0',
  'max-players=8',
  'view-distance=8',
  'simulation-distance=6',
  'allow-flight=true',
  'enable-command-block=true',
  '',
].join('\n');

const EULA = '# The Minecraft EULA (https://aka.ms/MinecraftEULA) was accepted in ResourcepackBuilder.\neula=true\n';

async function writeServerProperties() {
  const propsPath = path.join(serverDir(), 'server.properties');
  const props = fs.existsSync(propsPath) ? await fsp.readFile(propsPath, 'utf8') : DEFAULT_PROPERTIES;
  const port = `server-port=${state.config.port}`;
  const next = /^server-port=.*$/m.test(props) ? props.replace(/^server-port=.*$/m, port) : `${props.trimEnd()}\n${port}\n`;
  await fsp.writeFile(propsPath, next);
}

/** Recommended by Nexo; otherwise custom blocks based on note blocks, tripwire and chorus plants break. */
async function patchPaperGlobal() {
  const paperGlobal = path.join(serverDir(), 'config', 'paper-global.yml');
  if (!fs.existsSync(paperGlobal)) return; // created by Paper on its first start
  const text = await fsp.readFile(paperGlobal, 'utf8');
  const patched = text.replace(/^(\s+disable-(?:noteblock|tripwire|chorus-plant)-updates:)\s*false\s*$/gm, '$1 true');
  if (patched === text) return;
  await fsp.writeFile(paperGlobal, patched);
  info(t('testServer.paperSettingsPatched'));
}

/** Exactly the selected Nexo version in plugins/. */
async function installNexoPlugin() {
  const wanted = state.config.nexoJar?.file ?? null;
  for (const name of await fsp.readdir(pluginsDir())) {
    if (/^nexo.*\.jar$/i.test(name) && name !== wanted) await fsp.rm(path.join(pluginsDir(), name), { force: true });
  }
  if (!wanted) return;
  const source = path.join(pluginStore(), wanted);
  if (!fs.existsSync(source)) throw new Error(t('testServer.nexoJarMissing'));
  await fsp.copyFile(source, path.join(pluginsDir(), wanted));
}

async function prepareServerFiles() {
  await fsp.mkdir(pluginsDir(), { recursive: true });
  await fsp.writeFile(path.join(serverDir(), 'eula.txt'), EULA);
  await writeServerProperties();
  await patchPaperGlobal();
  // Cache of the obfuscated pack; can be corrupt after aborted runs
  for (const cache of [path.join(nexoDir(), 'pack', '.deobfCachedPacks'), path.join(nexoDir(), '.deobfCachedPacks')]) {
    await fsp.rm(cache, { recursive: true, force: true });
  }
  await installNexoPlugin();
}

module.exports = { prepareServerFiles };
