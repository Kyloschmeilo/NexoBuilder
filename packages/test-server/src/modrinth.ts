/**
 * The CraftEngine JAR on Modrinth (https://modrinth.com/plugin/craftengine): the version list the desktop program
 * fetches and the pick of the JAR for a Paper version. The response is checked, not guessed at.
 */
import { z } from 'zod';
import { CRAFT_ENGINE_JAR_FILE_PATTERN } from './config';

const MODRINTH_API = 'https://api.modrinth.com/v2';

/** The Modrinth project of CraftEngine and the loader of its Paper build (each version is also listed for Bukkit). */
const CRAFT_ENGINE_PROJECT = 'craftengine';
const PAPER_LOADER = 'paper';

/** The versions of CraftEngine's Paper build that support `paperVersion` (Modrinth filters them already). */
export function craftEngineVersionsUrl(paperVersion: string): string {
  const query = new URLSearchParams({
    loaders: JSON.stringify([PAPER_LOADER]),
    game_versions: JSON.stringify([paperVersion]),
  });
  return `${MODRINTH_API}/project/${CRAFT_ENGINE_PROJECT}/version?${query.toString()}`;
}

/** CraftEngine's Modrinth project id; its files lie under https://cdn.modrinth.com/data/<id>/. */
const CRAFT_ENGINE_PROJECT_ID = 'tRX6FMfQ';
const MODRINTH_CDN_HOST = 'cdn.modrinth.com';

/** Whether `url` is a file of CraftEngine on Modrinth's CDN (nothing else gets downloaded, whatever the list says). */
function isCraftEngineFileUrl(url: string): boolean {
  // zod runs this refine even after the URL check failed, so an unparsable URL must not throw
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === 'https:' &&
    parsed.hostname === MODRINTH_CDN_HOST &&
    parsed.port === '' &&
    parsed.username === '' &&
    parsed.password === '' &&
    parsed.pathname.startsWith(`/data/${CRAFT_ENGINE_PROJECT_ID}/`)
  );
}

const modrinthFileSchema = z.object({
  url: z.url({ protocol: /^https$/ }).refine(isCraftEngineFileUrl),
  filename: z.string(),
  primary: z.boolean().catch(false),
  hashes: z.object({ sha512: z.string().regex(/^[0-9a-fA-F]{128}$/) }),
});

const modrinthVersionSchema = z.object({
  version_number: z.string().min(1),
  version_type: z.enum(['release', 'beta', 'alpha']),
  date_published: z.string(),
  loaders: z.array(z.string()),
  game_versions: z.array(z.string()),
  files: z.array(z.unknown()),
});
export type ModrinthVersion = z.infer<typeof modrinthVersionSchema>;

/** GET /v2/project/{id}/version: versions that do not match the schema are left out, not the whole list. */
export const modrinthVersionsSchema = z
  .array(z.unknown())
  .transform((entries) => entries.flatMap((entry) => modrinthVersionSchema.safeParse(entry).data ?? []));

export interface CraftEngineDownload {
  version: string;
  url: string;
  /** The file name Modrinth gives it, matching {@link CRAFT_ENGINE_JAR_FILE_PATTERN}. */
  filename: string;
  sha512: string;
}

/** Modrinth's channels; all CraftEngine versions are "beta" so far, so betas count when there is no release. */
const CHANNEL_RANK: Record<ModrinthVersion['version_type'], number> = { release: 2, beta: 1, alpha: 0 };

/** The Paper JAR of a version: its file named like {@link CRAFT_ENGINE_JAR_FILE_PATTERN} (the primary one first). */
function paperJar(version: ModrinthVersion): CraftEngineDownload | null {
  const files = version.files.flatMap((file) => modrinthFileSchema.safeParse(file).data ?? []);
  const file = [...files].sort((a, b) => Number(b.primary) - Number(a.primary)).find((f) => CRAFT_ENGINE_JAR_FILE_PATTERN.test(f.filename));
  return file
    ? { version: version.version_number, url: file.url, filename: file.filename, sha512: file.hashes.sha512.toLowerCase() }
    : null;
}

/**
 * The CraftEngine JAR for `paperVersion`: of the versions with the Paper loader that list `paperVersion`, the most
 * stable channel (release, then beta, then alpha) and within it the newest. Null when there is none.
 */
export function pickCraftEngineVersion(versions: readonly ModrinthVersion[], paperVersion: string): CraftEngineDownload | null {
  let best: { version: ModrinthVersion; download: CraftEngineDownload; time: number } | null = null;
  for (const version of versions) {
    if (!version.loaders.includes(PAPER_LOADER) || !version.game_versions.includes(paperVersion)) continue;
    const download = paperJar(version);
    if (!download) continue;
    const time = Date.parse(version.date_published) || 0;
    const rank = CHANNEL_RANK[version.version_type];
    const bestRank = best ? CHANNEL_RANK[best.version.version_type] : -1;
    if (!best || rank > bestRank || (rank === bestRank && time > best.time)) best = { version, download, time };
  }
  return best?.download ?? null;
}
