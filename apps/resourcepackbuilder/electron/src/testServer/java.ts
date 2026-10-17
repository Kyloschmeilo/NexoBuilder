/** Java runtime for the server: the bundled one, the system one, or a downloaded Eclipse Temurin JRE. */
import { DesktopError } from '@resourcepackbuilder/desktop-contract';
import { parseJavaVersion } from '@resourcepackbuilder/test-server';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { t } from '../i18n';
import { testHooks } from '../testHooks';
import { adoptiumAssetsSchema, adoptiumChecksumSchema } from './apiSchemas';
import { download, fetchJson, fetchText } from './download';
import { downloadsDir, javaDir } from './paths';
import { logInfo, setState } from './state';

const ADOPTIUM_API = 'https://api.adoptium.net/v3';
const JAVA_EXECUTABLE = process.platform === 'win32' ? 'java.exe' : 'java';
const SEARCH_DEPTH = 3;

export interface JavaInstallation {
  path: string;
  version: number;
}

/** The major version of a Java executable, or null if it does not run. */
function javaVersionOf(javaPath: string): Promise<number | null> {
  return new Promise((resolve) => {
    execFile(javaPath, ['-version'], { timeout: 15_000, windowsHide: true }, (err, stdout, stderr) => {
      resolve(err ? null : parseJavaVersion(`${stderr}\n${stdout}`));
    });
  });
}

/** Every `bin/java(.exe)` in `dir` or a few levels below it. */
async function findJavasIn(dir: string, depth = 0): Promise<string[]> {
  if (depth > SEARCH_DEPTH) return [];
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const bin = path.join(dir, 'bin', JAVA_EXECUTABLE);
  if (fs.existsSync(bin)) return [bin];
  const found: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) found.push(...(await findJavasIn(path.join(dir, entry.name), depth + 1)));
  }
  return found;
}

function extract(archive: string, target: string, signal?: AbortSignal): Promise<void> {
  // Windows: the built-in tar.exe (bsdtar) can extract ZIP files
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  return new Promise((resolve, reject) =>
    execFile(tar, ['-xf', archive, '-C', target], { windowsHide: true, timeout: 5 * 60_000, signal }, (err, _out, stderr) =>
      err ? reject(new DesktopError('javaExtractFailed', { error: stderr || err.message })) : resolve(),
    ),
  );
}

const OS_NAMES: Partial<Record<NodeJS.Platform, string>> = { win32: 'windows', linux: 'linux', darwin: 'mac' };
const ARCHS: Partial<Record<NodeJS.Architecture, string>> = { x64: 'x64', arm64: 'aarch64' };

/**
 * The newest Temurin JRE package with its SHA-256: from the assets API, or – if that fails – the direct download link
 * with the checksum from Adoptium's checksum endpoint.
 */
async function temurinPackage(minVersion: number, osName: string, arch: string, signal?: AbortSignal) {
  try {
    const assets = await fetchJson(
      `${ADOPTIUM_API}/assets/latest/${minVersion}/hotspot?architecture=${arch}&image_type=jre&os=${osName}&vendor=eclipse`,
      adoptiumAssetsSchema,
      signal,
    );
    if (assets[0]) return assets[0].binary.package;
  } catch (err) {
    console.warn('Adoptium assets API failed; using the direct link', err);
  }
  const route = `latest/${minVersion}/ga/${osName}/${arch}/jre/hotspot/normal/eclipse`;
  let checksum = '';
  try {
    checksum = adoptiumChecksumSchema.parse(await fetchText(`${ADOPTIUM_API}/checksum/${route}`, signal));
  } catch (err) {
    console.warn('Adoptium checksum endpoint failed', err); // the download refuses to run without one
  }
  return {
    name: `java-${minVersion}${osName === 'windows' ? '.zip' : '.tar.gz'}`,
    link: `${ADOPTIUM_API}/binary/${route}`,
    checksum,
  };
}

/** A Java of at least `minVersion`; downloads Eclipse Temurin if none is installed (until `signal` is aborted). */
export async function ensureJava(minVersion: number, signal?: AbortSignal): Promise<JavaInstallation> {
  // The download for this version first, then any other downloaded Java (e.g. a newer one)
  const downloaded = [...(await findJavasIn(path.join(javaDir(), String(minVersion)))), ...(await findJavasIn(javaDir()))];
  const candidates = [...new Set(downloaded)];
  if (!testHooks.ignoreSystemJava) {
    if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, 'bin', JAVA_EXECUTABLE));
    candidates.push('java');
  }
  for (const candidate of candidates) {
    const version = await javaVersionOf(candidate);
    if (version && version >= minVersion) return { path: candidate, version };
  }

  const osName = OS_NAMES[process.platform];
  const arch = ARCHS[process.arch];
  if (!osName || !arch) throw new DesktopError('javaRequired', { version: minVersion });
  setState({ message: t('testServer.searchingJava', { version: minVersion }) });
  const jrePackage = await temurinPackage(minVersion, osName, arch, signal);
  const archive = path.join(downloadsDir(), jrePackage.name);
  logInfo(t('testServer.javaNotFound', { version: minVersion }));
  await download(jrePackage.link, archive, `Java ${minVersion}`, jrePackage.checksum, 'sha256', signal);

  setState({ message: t('testServer.extractingJava', { version: minVersion }) });
  const target = path.join(javaDir(), String(minVersion));
  await fsp.rm(target, { recursive: true, force: true });
  await fsp.mkdir(target, { recursive: true });
  await extract(archive, target, signal);
  await fsp.rm(archive, { force: true });
  const [javaPath] = await findJavasIn(target);
  const version = javaPath ? await javaVersionOf(javaPath) : null;
  if (!javaPath || !version) throw new DesktopError('javaBroken');
  return { path: javaPath, version };
}
