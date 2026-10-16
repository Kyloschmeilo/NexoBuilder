/**
 * Runtime checks for everything that reaches the main process from outside: the arguments of every invoke channel
 * (they come from the renderer) and the saved test-server settings (they come from disk). Typed against the contract,
 * so a channel without a schema – or a schema that does not match its arguments – fails to compile.
 */
import {
  clampInt,
  cleanPlayerName,
  DEFAULT_TEST_SERVER_CONFIG,
  MAX_PORT,
  MAX_RAM_GB,
  MIN_PORT,
  MIN_RAM_GB,
  PAPER_VERSION_PATTERN,
  PLAYER_NAME_PATTERN,
  PLUGIN_JAR_FILE_PATTERNS,
} from '@resourcepackbuilder/test-server';
import { PACK_TARGETS } from '@resourcepackbuilder/core/project';
import { SUPPORTED_LOCALES } from '@resourcepackbuilder/i18n/locale';
import { z } from 'zod';
import type { DesktopInvokeArgs, DesktopInvokeChannel, PluginJarInfo, TestServerConfig, TestServerConfigPatch } from './api';

/* ------------------------------------------------------------------ test-server settings */

const port = z.number().int().min(MIN_PORT).max(MAX_PORT);

const packTarget = z.enum(PACK_TARGETS);

/** A plugin JAR in the store of `target` (its file name ends up in a path, so it must match the target's pattern). */
const pluginJarInfoSchema = (target: (typeof PACK_TARGETS)[number]) =>
  z.object({
    file: z.string().regex(PLUGIN_JAR_FILE_PATTERNS[target]),
    name: z.string().max(200),
    version: z.string().max(200),
  }) satisfies z.ZodType<PluginJarInfo>;

export const pluginJarsSchema = z.object({
  nexo: pluginJarInfoSchema('nexo').optional(),
  craftengine: pluginJarInfoSchema('craftengine').optional(),
}) satisfies z.ZodType<TestServerConfig['pluginJars']>;

/** Complete, valid settings (as saved in testserver.json). */
export const testServerConfigSchema = z.object({
  paperVersion: z.string().regex(PAPER_VERSION_PATTERN).nullable(),
  ramGb: z.number().int().min(MIN_RAM_GB).max(MAX_RAM_GB),
  port,
  packPort: port,
  playerName: z.union([z.literal(''), z.string().regex(PLAYER_NAME_PATTERN)]),
  eulaAccepted: z.boolean(),
  autoUpdate: z.boolean(),
  pluginJars: pluginJarsSchema,
}) satisfies z.ZodType<TestServerConfig>;

/**
 * Settings as read from testserver.json: settings missing in older files are filled from the defaults, and the
 * `nexoJar` of files written before pack targets existed becomes `pluginJars.nexo`. Then the full check applies.
 */
export const savedTestServerConfigSchema = z.preprocess((config) => {
  const saved: Record<string, unknown> = typeof config === 'object' && config !== null ? { ...config } : {};
  if (saved.pluginJars === undefined && saved.nexoJar) saved.pluginJars = { nexo: saved.nexoJar };
  return { ...DEFAULT_TEST_SERVER_CONFIG, ...saved };
}, testServerConfigSchema);

const clampedInt = (min: number, max: number, fallback: number) => z.unknown().transform((value) => clampInt(value, min, max, fallback));

/**
 * A settings change from the UI. Values are corrected rather than refused (a number out of range is clamped, invalid
 * characters are removed from the player name), so the result always fits {@link testServerConfigSchema}.
 */
export const testServerConfigPatchSchema = z.object({
  paperVersion: z
    .unknown()
    .transform((value) => (typeof value === 'string' && PAPER_VERSION_PATTERN.test(value) ? value : null))
    .optional(),
  ramGb: clampedInt(MIN_RAM_GB, MAX_RAM_GB, DEFAULT_TEST_SERVER_CONFIG.ramGb).optional(),
  port: clampedInt(MIN_PORT, MAX_PORT, DEFAULT_TEST_SERVER_CONFIG.port).optional(),
  packPort: clampedInt(MIN_PORT, MAX_PORT, DEFAULT_TEST_SERVER_CONFIG.packPort).optional(),
  playerName: z.unknown().transform(cleanPlayerName).optional(),
  eulaAccepted: z
    .unknown()
    .transform((value) => value === true)
    .optional(),
  autoUpdate: z
    .unknown()
    .transform((value) => value !== false)
    .optional(),
}) satisfies z.ZodType<TestServerConfigPatch>;

/* ------------------------------------------------------------------ invoke arguments */

const folder = z.string().min(1);
const none = z.tuple([]);

const syncFileSchema = z.object({ path: z.string(), data: z.union([z.string(), z.instanceof(Uint8Array)]) });
const syncOptionsSchema = z.object({
  target: packTarget,
  packName: z.string().max(200),
  reload: z.boolean(),
  settings: z.string().optional(),
});

/** The argument list of every invoke channel. */
export const invokeSchemas: { [C in DesktopInvokeChannel]: z.ZodType<DesktopInvokeArgs<C>> } = {
  'app:set-locale': z.tuple([z.enum(SUPPORTED_LOCALES)]),

  'share:choose-folder': z.tuple([z.enum(['share', 'join'])]),
  'share:inspect': z.tuple([folder]),
  'share:create-subfolder': z.tuple([folder, z.string()]),
  'share:list': z.tuple([folder]),
  'share:read': z.tuple([folder, z.string()]),
  'share:write': z.tuple([folder, z.string(), z.string()]),
  'share:watch': z.tuple([folder]),
  'share:unwatch': z.tuple([folder]),
  'share:forget': z.tuple([folder]),
  'share:open-folder': z.tuple([folder]),
  'share:user-name': none,

  'testserver:get-state': none,
  'testserver:set-config': z.tuple([testServerConfigPatchSchema]),
  'testserver:versions': none,
  'testserver:choose-plugin-jar': z.tuple([packTarget]),
  'testserver:download-plugin': z.tuple([packTarget]),
  'testserver:start': z.tuple([packTarget]),
  'testserver:stop': none,
  'testserver:command': z.tuple([z.string().max(1000)]),
  'testserver:reload': none,
  'testserver:sync': z.tuple([z.array(syncFileSchema), syncOptionsSchema]),
  'testserver:read-plugin-config': z.tuple([packTarget]),
  'testserver:open-folder': none,
  'testserver:clear-log': none,
};
