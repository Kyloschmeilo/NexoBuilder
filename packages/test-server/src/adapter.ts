/**
 * The seam between the test server and a pack target's plugin (Nexo, CraftEngine): where the plugin keeps its files,
 * how its JAR is obtained, which config the app patches, its console commands and its log lines.
 */
import type { PackTargetId } from '@resourcepackbuilder/core/project';
import { CRAFT_ENGINE_SERVER_ADAPTER } from './craftEngine/adapter';
import { NEXO_SERVER_ADAPTER } from './nexo/adapter';
import type { ServerLogEvent } from './serverLog';

export interface ServerAdapter {
  target: PackTargetId;
  /** The plugin's name as users know it ("Nexo", "CraftEngine"). */
  pluginName: string;
  /** Plugin folder under the server dir: 'plugins/Nexo' | 'plugins/CraftEngine' */
  pluginDir: string;
  /**
   * How the JAR is obtained. `descriptorName` is the name in the JAR's plugin descriptor, which a JAR the user picks
   * must carry (a manual JAR stays possible for Modrinth plugins too, e.g. a premium build).
   */
  jar: { kind: 'manual'; descriptorName: string } | { kind: 'modrinth'; project: 'craftengine'; loader: 'paper'; descriptorName: string };
  /** Plugin config the app patches, relative to pluginDir: 'settings.yml' | 'config.yml' */
  configFile: string;
  /**
   * The plugin config with the values the test server needs (served locally on `packPort`). `attributes` and
   * `scripting`: the open project uses CraftEngine's attribute system or ships scripts, which the CraftEngine config
   * then switches on.
   */
  patchConfig(current: string | null, options: { packPort: number; attributes?: boolean; scripting?: boolean }): string;
  /** Values the plugin needs in Paper's config/paper-global.yml. */
  paperGlobalOverrides: Array<[string[], unknown]>;
  /**
   * Folder (in the JAR and relative to pluginDir) holding packs the plugin copies out of its JAR only on a first start
   * that finds no such folder; packs missing from it are restored from the JAR before every start. Null: none.
   */
  bundledFolder: string | null;
  /** Caches (relative to pluginDir) removed before every start, because aborted runs can leave them corrupt. */
  cachesToClear: string[];
  /** Segments of a path (relative to pluginDir) the project may write; null = refused */
  syncPathSegments(relativePath: string, project: { packName: string }): string[] | null;
  /** Reloads the plugin's configuration and rebuilds the resource pack. */
  reloadCommand: string;
  /** Whether a command typed by the user reloads the plugin (and so rebuilds the resource pack). */
  isReloadCommand(command: string): boolean;
  giveCommand(yamlKey: string, amount: number, player: string): string;
  /** Sends the resource pack to the player again; null when the plugin has no such command. */
  resendPackCommand(player: string): string | null;
  /** Whether {@link parsePluginLogLine} reports the pack build; without it nobody waits for a build. */
  reportsPackBuild: boolean;
  /**
   * Whether the plugin builds the pack on startup by itself. If not, the app sends {@link reloadCommand} once the
   * server is up, so the pack matches the project files.
   */
  buildsPackOnStart: boolean;
  /** The plugin's own console lines (the pack build); the shared Paper lines are read by `parseServerLogLine`. */
  parsePluginLogLine(line: string): ServerLogEvent | null;
}

export const SERVER_ADAPTERS: Record<PackTargetId, ServerAdapter> = {
  nexo: NEXO_SERVER_ADAPTER,
  craftengine: CRAFT_ENGINE_SERVER_ADAPTER,
};

/** The adapter for the plugin of `target`. */
export function serverAdapterFor(target: PackTargetId): ServerAdapter {
  return SERVER_ADAPTERS[target];
}

/**
 * Whether the pack builds of a server can be followed: it runs the plugin of `target` (a JAR is set in
 * `pluginJars`), and that plugin reports its builds in the console.
 */
export function tracksPackBuild(target: PackTargetId | null, pluginJars: Partial<Record<PackTargetId, unknown>>): boolean {
  return target !== null && Boolean(pluginJars[target]) && serverAdapterFor(target).reportsPackBuild;
}
