// @ts-check
/** Paper server: available versions and the server JAR (PaperMC "fill" API). */
const fs = require('node:fs');
const path = require('node:path');
const { t } = require('../i18n.cjs');
const { testHooks } = require('../testHooks.cjs');
const { download, fetchJson } = require('./download.cjs');
const { downloadsDir } = require('./paths.cjs');
const { info, setState } = require('./state.cjs');

const PAPER_API = 'https://fill.papermc.io/v3/projects/paper';
const VERSIONS_CACHE_MS = 10 * 60_000;

/** @type {{ time: number, list: string[] } | null} */
let versionsCache = null;

/** @returns {Promise<string[]>} */
async function paperVersions() {
  if (testHooks.paperJar) return [testHooks.paperVersion];
  if (versionsCache && Date.now() - versionsCache.time < VERSIONS_CACHE_MS) return versionsCache.list;
  const data = await fetchJson(PAPER_API);
  /** @type {unknown[]} */
  const groups = data && typeof data.versions === 'object' ? Object.values(data.versions) : [];
  const list = groups.flat().filter((version) => typeof version === 'string');
  versionsCache = { time: Date.now(), list };
  return list;
}

/**
 * Minimum Java version, in case the Paper API does not specify one.
 * @param {string} mcVersion
 */
function guessJavaFor(mcVersion) {
  const [major, minor = 0, patch = 0] = mcVersion.split('.').map((n) => parseInt(n, 10) || 0);
  if (major >= 26) return 25;
  if (major === 1 && (minor > 20 || (minor === 20 && patch >= 5))) return 21;
  return 17;
}

/**
 * Finds the newest (preferably stable) Paper build for `version` and downloads it unless it is cached.
 * @param {string} version
 * @returns {Promise<{ jar: string, version: string, build: number, javaMin: number }>}
 */
async function ensurePaper(version) {
  if (testHooks.paperJar) return { jar: testHooks.paperJar, version: version || 'test', build: 0, javaMin: 17 };

  setState({ message: t('testServer.searchingPaper', { version }) });
  const builds = await fetchJson(`${PAPER_API}/versions/${encodeURIComponent(version)}/builds`);
  if (!Array.isArray(builds) || builds.length === 0) throw new Error(t('testServer.noPaperBuild', { version }));
  const stable = builds.filter((build) => build?.channel === 'STABLE');
  const pool = stable.length ? stable : builds;
  const pick = pool.reduce((best, build) => (!best || Number(build.id) > Number(best.id) ? build : best), null);
  const dl = pick?.downloads?.['server:default'];
  if (!dl?.url) throw new Error(t('testServer.noPaperDownload', { version }));
  const build = Number(pick.id);
  if (!stable.length) info(t('testServer.experimentalBuild', { version, build }));

  let javaMin = guessJavaFor(version);
  try {
    const meta = await fetchJson(`${PAPER_API}/versions/${encodeURIComponent(version)}`);
    const min = meta?.version?.java?.version?.minimum ?? meta?.java?.version?.minimum;
    if (Number.isInteger(min) && min > 0) javaMin = min;
  } catch {
    // the estimate is good enough
  }

  const name = typeof dl.name === 'string' && /^[\w.-]+\.jar$/.test(dl.name) ? dl.name : `paper-${version}-${build}.jar`;
  const dest = path.join(downloadsDir(), name);
  if (!fs.existsSync(dest)) {
    info(t('testServer.downloadingPaper', { version, build }));
    await download(dl.url, dest, `Paper ${version}`, dl.checksums?.sha256);
  }
  return { jar: dest, version, build, javaMin };
}

module.exports = { paperVersions, ensurePaper };
