/**
 * Settings of the local test server: their shape, defaults and limits. Shared by the desktop program (which saves and
 * validates them) and the UI (which offers them).
 */

export const DEFAULT_MINECRAFT_PORT = 25565;
export const DEFAULT_PACK_PORT = 8082;
/** Ports below this need administrator rights. */
export const MIN_PORT = 1024;
export const MAX_PORT = 65535;

export const MIN_RAM_GB = 1;
export const MAX_RAM_GB = 16;
/** Memory sizes the UI offers. */
export const RAM_OPTIONS_GB = [1, 2, 3, 4, 6, 8] as const;

/** Minecraft player names: 3–16 letters, digits and underscores (shorter legacy names exist, so 1 is allowed). */
export const MAX_PLAYER_NAME_LENGTH = 16;
export const PLAYER_NAME_PATTERN = /^[A-Za-z0-9_]{1,16}$/;
/** Characters a player name cannot contain (global: use with `replace`). */
export const PLAYER_NAME_INVALID_CHARS = /[^A-Za-z0-9_]/g;

/** A Paper version as listed by the PaperMC API, e.g. "1.21.11"; it ends up in file names. */
export const PAPER_VERSION_PATTERN = /^[0-9A-Za-z._-]{1,32}$/;

/** File name of the Nexo JAR in the test server's plugin store (`Nexo-<version>.jar`, no path separators). */
export const NEXO_JAR_FILE_PATTERN = /^Nexo-[\w.-]{1,64}\.jar$/;

/** Console lines kept for the UI (by the desktop program and in the UI's store). */
export const TEST_SERVER_LOG_LIMIT = 2000;

export interface NexoJarInfo {
  /** File name in the plugin store, see {@link NEXO_JAR_FILE_PATTERN}. */
  file: string;
  name: string;
  version: string;
}

export interface TestServerConfig {
  paperVersion: string | null;
  ramGb: number;
  port: number;
  packPort: number;
  playerName: string;
  eulaAccepted: boolean;
  autoUpdate: boolean;
  nexoJar: NexoJarInfo | null;
}

export const DEFAULT_TEST_SERVER_CONFIG: Readonly<TestServerConfig> = Object.freeze({
  paperVersion: null,
  ramGb: 2,
  port: DEFAULT_MINECRAFT_PORT,
  packPort: DEFAULT_PACK_PORT,
  playerName: '',
  eulaAccepted: false,
  autoUpdate: true,
  nexoJar: null,
});

/** File name for the Nexo JAR of `version` in the plugin store (always matches {@link NEXO_JAR_FILE_PATTERN}). */
export function nexoJarFileName(version: string): string {
  return `Nexo-${version.replace(/[^\w.-]/g, '_').slice(0, 64) || 'unknown'}.jar`;
}

/** `value` as a whole number between `min` and `max`; `fallback` when it is no number at all. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return Math.min(max, Math.max(min, Math.round(Number(value) || fallback)));
}

/** A typed-in player name with invalid characters removed, at most {@link MAX_PLAYER_NAME_LENGTH} long. */
export function cleanPlayerName(value: unknown): string {
  return String(value ?? '')
    .replace(PLAYER_NAME_INVALID_CHARS, '')
    .slice(0, MAX_PLAYER_NAME_LENGTH);
}
