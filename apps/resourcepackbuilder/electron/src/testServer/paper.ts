/** Paper server: available versions and the server JAR (PaperMC "fill" API). */
import { guessJavaFor } from '@resourcepackbuilder/test-server';
import fs from 'node:fs';
import path from 'node:path';
import { t } from '../i18n';
import { testHooks } from '../testHooks';
import { paperBuildSchema, paperBuildsSchema, paperProjectSchema, paperVersionSchema, type PaperBuild } from './apiSchemas';
import { download, fetchJson } from './download';
import { downloadsDir } from './paths';
import { logInfo, setState } from './state';

const PAPER_API = 'https://fill.papermc.io/v3/projects/paper';
const VERSIONS_CACHE_MS = 10 * 60_000;

export interface PaperInstallation {
  jar: string;
  version: string;
  build: number;
  javaMin: number;
}

let versionsCache: { time: number; list: string[] } | null = null;

export async function paperVersions(): Promise<string[]> {
  if (testHooks.paperJar) return [testHooks.paperVersion];
  if (versionsCache && Date.now() - versionsCache.time < VERSIONS_CACHE_MS) return versionsCache.list;
  const data = await fetchJson(PAPER_API, paperProjectSchema);
  const list = Object.values(data.versions).flat();
  versionsCache = { time: Date.now(), list };
  return list;
}

/** The newest stable build, or the newest of any channel when there is no stable one. */
function pickBuild(builds: PaperBuild[]): { build: PaperBuild; stable: boolean } | null {
  const stable = builds.filter((build) => build.channel === 'STABLE');
  const pool = stable.length ? stable : builds;
  const newest = pool.reduce<PaperBuild | null>((best, build) => (!best || build.id > best.id ? build : best), null);
  return newest && { build: newest, stable: stable.length > 0 };
}

/** Finds the newest (preferably stable) Paper build for `version` and downloads it unless it is cached. */
export async function ensurePaper(version: string): Promise<PaperInstallation> {
  if (testHooks.paperJar) return { jar: testHooks.paperJar, version: version || 'test', build: 0, javaMin: 17 };

  setState({ message: t('testServer.searchingPaper', { version }) });
  const entries = await fetchJson(`${PAPER_API}/versions/${encodeURIComponent(version)}/builds`, paperBuildsSchema);
  if (entries.length === 0) throw new Error(t('testServer.noPaperBuild', { version }));
  // Builds without a verifiable server download (e.g. a different layout) are skipped
  const picked = pickBuild(entries.flatMap((entry) => paperBuildSchema.safeParse(entry).data ?? []));
  if (!picked) throw new Error(t('testServer.noPaperDownload', { version }));
  const build = picked.build.id;
  const serverDownload = picked.build.downloads['server:default'];
  if (!picked.stable) logInfo(t('testServer.experimentalBuild', { version, build }));

  let javaMin = guessJavaFor(version);
  try {
    const meta = await fetchJson(`${PAPER_API}/versions/${encodeURIComponent(version)}`, paperVersionSchema);
    javaMin = meta.version.java.version.minimum;
  } catch {
    // the estimate is good enough
  }

  const name = /^[\w.-]+\.jar$/.test(serverDownload.name) ? serverDownload.name : `paper-${version}-${build}.jar`;
  const jarPath = path.join(downloadsDir(), name);
  if (!fs.existsSync(jarPath)) {
    logInfo(t('testServer.downloadingPaper', { version, build }));
    await download(serverDownload.url, jarPath, `Paper ${version}`, serverDownload.checksums.sha256);
  }
  return { jar: jarPath, version, build, javaMin };
}
