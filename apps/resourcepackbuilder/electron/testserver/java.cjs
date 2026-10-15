// @ts-check
/** Java runtime for the server: the bundled one, the system one, or a downloaded Eclipse Temurin JRE. */
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const { t } = require('../i18n.cjs');
const { testHooks } = require('../testHooks.cjs');
const { download, fetchJson } = require('./download.cjs');
const { downloadsDir, javaDir } = require('./paths.cjs');
const { info, setState } = require('./state.cjs');

const ADOPTIUM_API = 'https://api.adoptium.net/v3';
const JAVA_EXECUTABLE = process.platform === 'win32' ? 'java.exe' : 'java';
const SEARCH_DEPTH = 3;

/**
 * The major version of a Java executable, or null if it does not run.
 * @param {string} javaPath
 * @returns {Promise<number | null>}
 */
function javaVersionOf(javaPath) {
  return new Promise((resolve) => {
    execFile(javaPath, ['-version'], { timeout: 15_000, windowsHide: true }, (err, stdout, stderr) => {
      if (err) return resolve(null);
      const match = /version "(\d+)(?:\.(\d+))?/.exec(`${stderr}\n${stdout}`);
      if (!match) return resolve(null);
      const first = parseInt(match[1], 10);
      resolve(first === 1 ? parseInt(match[2] ?? '0', 10) : first);
    });
  });
}

/**
 * Finds `bin/java(.exe)` in `dir` or a few levels below it.
 * @param {string} dir
 * @param {number} [depth]
 * @returns {Promise<string | null>}
 */
async function findJavaIn(dir, depth = 0) {
  if (depth > SEARCH_DEPTH) return null;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const bin = path.join(dir, 'bin', JAVA_EXECUTABLE);
  if (fs.existsSync(bin)) return bin;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = await findJavaIn(path.join(dir, entry.name), depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * @param {string} archive
 * @param {string} target
 * @returns {Promise<void>}
 */
function extract(archive, target) {
  // Windows: the built-in tar.exe (bsdtar) can extract ZIP files
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  return new Promise((resolve, reject) =>
    execFile(tar, ['-xf', archive, '-C', target], { windowsHide: true, timeout: 5 * 60_000 }, (err, _out, stderr) =>
      err ? reject(new Error(t('testServer.javaExtractFailed', { error: stderr || err.message }))) : resolve(),
    ),
  );
}

/**
 * A Java of at least `minVersion`; downloads Eclipse Temurin if none is installed.
 * @param {number} minVersion
 * @returns {Promise<{ path: string, version: number }>}
 */
async function ensureJava(minVersion) {
  const candidates = [];
  const bundled = await findJavaIn(javaDir());
  if (bundled) candidates.push(bundled);
  if (!testHooks.ignoreSystemJava) {
    if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, 'bin', JAVA_EXECUTABLE));
    candidates.push('java');
  }
  for (const candidate of candidates) {
    const version = await javaVersionOf(candidate);
    if (version && version >= minVersion) return { path: candidate, version };
  }

  /** @type {Partial<Record<NodeJS.Platform, string>>} */
  const osNames = { win32: 'windows', linux: 'linux', darwin: 'mac' };
  /** @type {Partial<Record<NodeJS.Architecture, string>>} */
  const archs = { x64: 'x64', arm64: 'aarch64' };
  const osName = osNames[process.platform];
  const arch = archs[process.arch];
  if (!osName || !arch) throw new Error(t('testServer.javaRequired', { version: minVersion }));
  setState({ message: t('testServer.searchingJava', { version: minVersion }) });
  let pkg = null;
  try {
    const assets = await fetchJson(
      `${ADOPTIUM_API}/assets/latest/${minVersion}/hotspot?architecture=${arch}&image_type=jre&os=${osName}&vendor=eclipse`,
    );
    pkg = Array.isArray(assets) ? assets[0]?.binary?.package : null;
  } catch {
    // fall back to the direct download link
  }
  const url = pkg?.link || `${ADOPTIUM_API}/binary/latest/${minVersion}/ga/${osName}/${arch}/jre/hotspot/normal/eclipse`;
  const archiveName =
    typeof pkg?.name === 'string' && /^[\w.+-]+$/.test(pkg.name)
      ? pkg.name
      : `java-${minVersion}${osName === 'windows' ? '.zip' : '.tar.gz'}`;
  const archive = path.join(downloadsDir(), archiveName);
  info(t('testServer.javaNotFound', { version: minVersion }));
  await download(url, archive, `Java ${minVersion}`, pkg?.checksum);

  setState({ message: t('testServer.extractingJava', { version: minVersion }) });
  const target = path.join(javaDir(), String(minVersion));
  await fsp.rm(target, { recursive: true, force: true });
  await fsp.mkdir(target, { recursive: true });
  await extract(archive, target);
  await fsp.rm(archive, { force: true });
  const javaPath = await findJavaIn(target);
  const version = javaPath ? await javaVersionOf(javaPath) : null;
  if (!javaPath || !version) throw new Error(t('testServer.javaBroken'));
  return { path: javaPath, version };
}

module.exports = { ensureJava };
