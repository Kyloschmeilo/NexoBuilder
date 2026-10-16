/**
 * The test server's CraftEngine plugin: plugins/CraftEngine, config.yml, the CraftEngine commands (as in its
 * commands.yml) and its pack build log lines. The JAR comes from Modrinth (see modrinth.ts).
 */
import { CRAFT_ENGINE_RESERVED_PACK_NAME } from '@resourcepackbuilder/export';
import type { ServerAdapter } from '../adapter';
import { assertCommandArg, assertPlayerName } from '../commands';
import { isSafeSegment, isUnderSyncPaths, safePathSegments } from '../syncPaths';
import { patchCraftEngineConfig } from './config';
import { parseCraftEngineLogLine } from './log';

/** What the export writes into resources/<pack>/ of plugins/CraftEngine. */
const SYNC_FILES = ['pack.yml'];
const SYNC_DIRS = ['configuration/', 'resourcepack/'];

/** A CraftEngine reload typed by the user ("ce reload …", "craftengine reload …"). */
const RELOAD_COMMAND_PATTERN = /^\/?(ce|craftengine)\s+reload\b/i;

/** Whether the project's pack may live in resources/<packName>/ (a safe name that is not one of CraftEngine's packs, which the app never writes or deletes). */
export function isCraftEnginePackName(packName: string): boolean {
  return isSafeSegment(packName) && !CRAFT_ENGINE_RESERVED_PACK_NAME.test(packName);
}

export const CRAFT_ENGINE_SERVER_ADAPTER: ServerAdapter = {
  target: 'craftengine',
  pluginName: 'CraftEngine',
  pluginDir: 'plugins/CraftEngine',
  jar: { kind: 'modrinth', project: 'craftengine', loader: 'paper', descriptorName: 'CraftEngine' },
  configFile: 'config.yml',
  patchConfig: patchCraftEngineConfig,
  paperGlobalOverrides: [],
  cachesToClear: [],
  /** resources/<packName>/pack.yml, …/configuration/… and …/resourcepack/…; anything else is refused. */
  syncPathSegments(relativePath, { packName }) {
    if (!isCraftEnginePackName(packName)) return null;
    const prefix = `resources/${packName}/`;
    if (!relativePath.startsWith(prefix)) return null;
    return isUnderSyncPaths(relativePath.slice(prefix.length), SYNC_DIRS, SYNC_FILES) ? safePathSegments(relativePath) : null;
  },
  /** Reloads the configs and runs the reload_pack workflows (generate, zip, upload, send). */
  reloadCommand: 'ce reload all',
  isReloadCommand(command) {
    return RELOAD_COMMAND_PATTERN.test(command.trim());
  },
  /** "ce item give <player> <id> [amount]" (amount 1–9999) */
  giveCommand(yamlKey, amount, player) {
    assertCommandArg(yamlKey);
    assertPlayerName(player);
    return `ce item give ${player} ${yamlKey} ${Math.min(9999, Math.max(1, Math.floor(amount)))}`;
  },
  /** "ce feature send-pack <player>": sends the resource pack to the player again. */
  resendPackCommand(player) {
    assertPlayerName(player);
    return `ce feature send-pack ${player}`;
  },
  // CraftEngine builds no pack on startup (only its reload_pack workflow does), and the log patterns are not yet
  // checked against a real run: a missed "ready" line would hold every reload back.
  reportsPackBuild: false,
  parsePluginLogLine: parseCraftEngineLogLine,
};
