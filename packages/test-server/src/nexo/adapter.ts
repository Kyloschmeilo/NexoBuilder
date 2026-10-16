/** The test server's Nexo plugin: plugins/Nexo, settings.yml, the Nexo commands and its pack build log lines. */
import { NEXO_PLUGIN_DIR, NEXO_RELOAD_COMMAND, PAINTINGS_FILE, SOUNDS_FILE } from '@resourcepackbuilder/export';
import type { ServerAdapter } from '../adapter';
import { assertCommandArg, assertPlayerName } from '../commands';
import { isUnderSyncPaths, safePathSegments } from '../syncPaths';
import { parseNexoLogLine } from './log';
import { patchNexoSettings } from './settings';

/** Folders under plugins/Nexo the export writes into. */
const SYNC_DIRS = ['items/', 'recipes/', 'glyphs/', 'pack/external_packs/'];
/** Single files directly in plugins/Nexo (there is only one of each). */
const SYNC_FILES = [SOUNDS_FILE, PAINTINGS_FILE];

/** Recommended by Nexo; otherwise custom blocks based on note blocks, tripwire and chorus plants break. */
const NEXO_BLOCK_UPDATE_SETTINGS = ['disable-noteblock-updates', 'disable-tripwire-updates', 'disable-chorus-plant-updates'];

/** A Nexo reload typed by the user ("nexo reload …", "/n rl" …). */
const RELOAD_COMMAND_PATTERN = /^\/?(nexo|n)\s+(reload|rl)\b/i;

export const NEXO_SERVER_ADAPTER: ServerAdapter = {
  target: 'nexo',
  pluginName: 'Nexo',
  pluginDir: NEXO_PLUGIN_DIR,
  jar: { kind: 'manual', descriptorName: 'Nexo' },
  configFile: 'settings.yml',
  patchConfig: patchNexoSettings,
  paperGlobalOverrides: NEXO_BLOCK_UPDATE_SETTINGS.map((key) => [['block-updates', key], true]),
  // Cache of the obfuscated pack
  cachesToClear: ['pack/.deobfCachedPacks', '.deobfCachedPacks'],
  /**
   * Exactly the places the export puts things (see `pluginFolderFiles` in files.ts). Anything else – settings.yml,
   * other plugins' data, paths with ".." – is refused.
   */
  syncPathSegments(relativePath) {
    return isUnderSyncPaths(relativePath, SYNC_DIRS, SYNC_FILES) ? safePathSegments(relativePath) : null;
  },
  reloadCommand: NEXO_RELOAD_COMMAND,
  isReloadCommand(command) {
    return RELOAD_COMMAND_PATTERN.test(command.trim());
  },
  /** Nexo 1.29: "nexo give <item> <amount> <player>" (as registered in the plugin – not as in the help text) */
  giveCommand(yamlKey, amount, player) {
    assertCommandArg(yamlKey);
    assertPlayerName(player);
    return `nexo give ${yamlKey} ${Math.max(1, Math.floor(amount))} ${player}`;
  },
  /** "nexo pack <player>": sends the resource pack to the player again. */
  resendPackCommand(player) {
    assertPlayerName(player);
    return `nexo pack ${player}`;
  },
  reportsPackBuild: true,
  buildsPackOnStart: true,
  parsePluginLogLine: parseNexoLogLine,
};
