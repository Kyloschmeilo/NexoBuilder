/**
 * The test server's CraftEngine plugin. A skeleton until T9, which patches config.yml, reads the log lines from a real
 * run and downloads the JAR from Modrinth.
 */
import type { ServerAdapter } from '../adapter';
import { assertCommandArg, assertPlayerName } from '../commands';
import { isSafeSegment, isUnderSyncPaths, safePathSegments } from '../syncPaths';

/** What the export writes into resources/<pack>/ of plugins/CraftEngine. */
const SYNC_FILES = ['pack.yml'];
const SYNC_DIRS = ['configuration/', 'resourcepack/'];

/** A CraftEngine reload typed by the user ("ce reload …", "craftengine reload …"). */
const RELOAD_COMMAND_PATTERN = /^\/?(ce|craftengine)\s+reload\b/i;

export const CRAFT_ENGINE_SERVER_ADAPTER: ServerAdapter = {
  target: 'craftengine',
  pluginName: 'CraftEngine',
  pluginDir: 'plugins/CraftEngine',
  jar: { kind: 'modrinth', project: 'craftengine', loader: 'paper', descriptorName: 'CraftEngine' },
  configFile: 'config.yml',
  // T9 sets the self-host values
  patchConfig: (current) => current ?? '',
  paperGlobalOverrides: [],
  cachesToClear: [],
  /** resources/<packName>/pack.yml, …/configuration/… and …/resourcepack/…; anything else is refused. */
  syncPathSegments(relativePath, { packName }) {
    if (!isSafeSegment(packName)) return null;
    const prefix = `resources/${packName}/`;
    if (!relativePath.startsWith(prefix)) return null;
    return isUnderSyncPaths(relativePath.slice(prefix.length), SYNC_DIRS, SYNC_FILES) ? safePathSegments(relativePath) : null;
  },
  reloadCommand: 'ce reload all',
  isReloadCommand(command) {
    return RELOAD_COMMAND_PATTERN.test(command.trim());
  },
  /** "ce item give <player> <id> <amount>" */
  giveCommand(yamlKey, amount, player) {
    assertCommandArg(yamlKey);
    assertPlayerName(player);
    return `ce item give ${player} ${yamlKey} ${Math.max(1, Math.floor(amount))}`;
  },
  resendPackCommand: () => null,
  reportsPackBuild: false,
  parsePluginLogLine: () => null,
};
