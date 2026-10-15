/**
 * Local test server (Paper + Nexo) for ResourcepackBuilder.
 *
 * - downloads Paper (PaperMC) and, if needed, Java (Eclipse Temurin)
 * - sets up the server (EULA only after consent, server.properties, Nexo plugin)
 * - starts it as a child process and forwards the console to the UI
 * - writes the project files to plugins/Nexo and then reloads Nexo
 *
 * Everything lives in <AppData>/testserver. The user brings their own Nexo JAR;
 * it is only copied into this folder, never redistributed.
 */
const { app, BrowserWindow, dialog, ipcMain, net, shell } = require('electron');
const { execFile, spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const zlib = require('node:zlib');
const { t } = require('./messages.cjs');

const PAPER_API = 'https://fill.papermc.io/v3/projects/paper';
const ADOPTIUM_API = 'https://api.adoptium.net/v3';
const LOG_LIMIT = 3000;
const STOP_TIMEOUT_MS = 45_000;

const DEFAULT_CONFIG = {
  paperVersion: null,
  ramGb: 2,
  port: 25565,
  packPort: 8082,
  playerName: '',
  eulaAccepted: false,
  autoUpdate: true,
  nexoJar: null, // { file, name, version }
};

/* ------------------------------------------------------------------ paths */

const rootDir = () => process.env.RESOURCEPACKBUILDER_TESTSERVER_DIR || path.join(app.getPath('userData'), 'testserver');
const serverDir = () => path.join(rootDir(), 'server');
const nexoDir = () => path.join(serverDir(), 'plugins', 'Nexo');
const downloadsDir = () => path.join(rootDir(), 'downloads');
const javaDir = () => path.join(rootDir(), 'java');
const pluginStore = () => path.join(rootDir(), 'nexo-plugin');
const configFile = () => path.join(rootDir(), 'testserver.json');
const manifestFile = () => path.join(rootDir(), 'sync-manifest.json');

const userAgent = () => `ResourcepackBuilder/${app.getVersion()} (https://github.com/SLNE-Development/ResourcepackBuilder)`;

/* ------------------------------------------------------------------ state */

const state = {
  status: 'stopped', // stopped | preparing | starting | running | stopping | error
  message: null,
  progress: null,
  config: { ...DEFAULT_CONFIG },
  installed: null, // { paperVersion, paperBuild, javaPath, javaVersion }
  startedAt: null,
  lastSync: null,
  // Nexo's resource pack: idle | building | ready | failed
  pack: { status: 'idle', message: null, at: null },
};
let log = [];
let pendingLines = [];
let flushTimer = null;
let proc = null;
let stopRequested = false;
let configLoaded = false;

function publicState() {
  return {
    status: state.status,
    message: state.message,
    progress: state.progress,
    config: state.config,
    installed: state.installed,
    startedAt: state.startedAt,
    lastSync: state.lastSync,
    pack: state.pack,
    serverDir: serverDir(),
    address: state.config.port === 25565 ? 'localhost' : `localhost:${state.config.port}`,
  };
}

function broadcast(event) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('testserver:event', event);
  }
}

function setState(patch) {
  Object.assign(state, patch);
  broadcast({ type: 'state', state: publicState() });
}

function pushLog(line, kind = 'out') {
  const entry = { t: Date.now(), line: line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, ''), kind };
  log.push(entry);
  if (log.length > LOG_LIMIT) log = log.slice(-LOG_LIMIT);
  pendingLines.push(entry);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      const lines = pendingLines;
      pendingLines = [];
      broadcast({ type: 'log', lines });
    }, 100);
  }
}

const info = (line) => pushLog(line, 'info');

async function loadConfig() {
  if (configLoaded) return;
  configLoaded = true;
  try {
    const saved = JSON.parse(await fsp.readFile(configFile(), 'utf8'));
    state.config = { ...DEFAULT_CONFIG, ...saved.config };
    state.installed = saved.installed ?? null;
  } catch {
    // first launch
  }
}

async function saveConfig() {
  await fsp.mkdir(rootDir(), { recursive: true });
  await fsp.writeFile(configFile(), JSON.stringify({ config: state.config, installed: state.installed }, null, 1));
}

function cleanConfigPatch(patch) {
  const next = {};
  if (patch == null || typeof patch !== 'object') return next;
  if ('paperVersion' in patch) next.paperVersion = typeof patch.paperVersion === 'string' && /^[0-9A-Za-z._-]{1,32}$/.test(patch.paperVersion) ? patch.paperVersion : null;
  if ('ramGb' in patch) next.ramGb = Math.min(16, Math.max(1, Math.round(Number(patch.ramGb) || 2)));
  if ('port' in patch) next.port = Math.min(65535, Math.max(1024, Math.round(Number(patch.port) || 25565)));
  if ('packPort' in patch) next.packPort = Math.min(65535, Math.max(1024, Math.round(Number(patch.packPort) || 8082)));
  if ('playerName' in patch) next.playerName = String(patch.playerName ?? '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16);
  if ('eulaAccepted' in patch) next.eulaAccepted = patch.eulaAccepted === true;
  if ('autoUpdate' in patch) next.autoUpdate = patch.autoUpdate !== false;
  return next;
}

/* ------------------------------------------------------------------ Downloads */

async function fetchJson(url) {
  const res = await net.fetch(url, { headers: { 'User-Agent': userAgent(), Accept: 'application/json' } });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // not a JSON response
  }
  if (!res.ok) throw new Error(data?.message ? `${data.message} (${res.status})` : t('ts.requestFailed', { status: res.status, url }));
  return data;
}

async function download(url, dest, label, expectedSha256) {
  const res = await net.fetch(url, { headers: { 'User-Agent': userAgent() } });
  if (!res.ok || !res.body) throw new Error(t('ts.downloadFailed', { status: res.status, label }));
  const total = Number(res.headers.get('content-length')) || 0;
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  const file = fs.createWriteStream(tmp);
  const hash = crypto.createHash('sha256');
  let received = 0;
  let lastPercent = -1;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      received += value.length;
      if (!file.write(value)) await new Promise((resolve) => file.once('drain', resolve));
      const percent = total ? Math.floor((received / total) * 100) : null;
      if (percent !== lastPercent) {
        lastPercent = percent;
        setState({ message: percent !== null ? t('ts.downloadingPercent', { label, percent }) : t('ts.downloading', { label }), progress: percent });
      }
    }
    await new Promise((resolve, reject) => file.end((err) => (err ? reject(err) : resolve())));
  } catch (err) {
    file.destroy();
    await fsp.rm(tmp, { force: true });
    throw err;
  }
  if (expectedSha256 && hash.digest('hex') !== String(expectedSha256).toLowerCase()) {
    await fsp.rm(tmp, { force: true });
    throw new Error(t('ts.checksumMismatch', { label }));
  }
  await fsp.rename(tmp, dest);
  setState({ progress: null });
}

/* ------------------------------------------------------------------ Paper */

let versionsCache = null;

async function paperVersions() {
  if (process.env.RESOURCEPACKBUILDER_TEST_PAPER_JAR) return [process.env.RESOURCEPACKBUILDER_TEST_PAPER_VERSION || '1.21.11'];
  if (versionsCache && Date.now() - versionsCache.time < 10 * 60_000) return versionsCache.list;
  const data = await fetchJson(PAPER_API);
  const groups = data && typeof data.versions === 'object' ? Object.values(data.versions) : [];
  const list = groups.flat().filter((v) => typeof v === 'string');
  versionsCache = { time: Date.now(), list };
  return list;
}

/** Minimum Java version, in case the Paper API does not specify one */
function guessJavaFor(mcVersion) {
  const [major, minor = 0, patch = 0] = String(mcVersion)
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  if (major >= 26) return 25;
  if (major === 1 && (minor > 20 || (minor === 20 && patch >= 5))) return 21;
  if (major === 1 && minor >= 18) return 17;
  return 17;
}

async function ensurePaper(version) {
  const testJar = process.env.RESOURCEPACKBUILDER_TEST_PAPER_JAR; // automated tests only
  if (testJar) return { jar: testJar, version: version || 'test', build: 0, javaMin: 17 };

  setState({ message: t('ts.searchingPaper', { version }) });
  const builds = await fetchJson(`${PAPER_API}/versions/${encodeURIComponent(version)}/builds`);
  if (!Array.isArray(builds) || builds.length === 0) throw new Error(t('ts.noPaperBuild', { version }));
  const stable = builds.filter((b) => b && b.channel === 'STABLE');
  const pool = stable.length ? stable : builds;
  const pick = pool.reduce((best, b) => (!best || Number(b.id) > Number(best.id) ? b : best), null);
  const dl = pick?.downloads?.['server:default'];
  if (!dl?.url) throw new Error(t('ts.noPaperDownload', { version }));
  if (!stable.length) info(t('ts.experimentalBuild', { version, build: pick.id }));

  let javaMin = guessJavaFor(version);
  try {
    const meta = await fetchJson(`${PAPER_API}/versions/${encodeURIComponent(version)}`);
    const min = meta?.version?.java?.version?.minimum ?? meta?.java?.version?.minimum;
    if (Number.isInteger(min) && min > 0) javaMin = min;
  } catch {
    // the estimate is good enough
  }

  const name = typeof dl.name === 'string' && /^[\w.-]+\.jar$/.test(dl.name) ? dl.name : `paper-${version}-${pick.id}.jar`;
  const dest = path.join(downloadsDir(), name);
  if (!fs.existsSync(dest)) {
    info(t('ts.downloadingPaper', { version, build: pick.id }));
    await download(dl.url, dest, `Paper ${version}`, dl.checksums?.sha256);
  }
  return { jar: dest, version, build: pick.id, javaMin };
}

/* ------------------------------------------------------------------ Java */

function javaExecutableName() {
  return process.platform === 'win32' ? 'java.exe' : 'java';
}

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

async function findJavaIn(dir, depth = 0) {
  if (depth > 3) return null;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const bin = path.join(dir, 'bin', javaExecutableName());
  if (fs.existsSync(bin)) return bin;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = await findJavaIn(path.join(dir, entry.name), depth + 1);
    if (found) return found;
  }
  return null;
}

async function ensureJava(minVersion) {
  const candidates = [];
  const bundled = await findJavaIn(javaDir());
  if (bundled) candidates.push(bundled);
  if (!process.env.RESOURCEPACKBUILDER_TEST_IGNORE_SYSTEM_JAVA) {
    if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, 'bin', javaExecutableName()));
    candidates.push('java');
  }
  for (const candidate of candidates) {
    const version = await javaVersionOf(candidate);
    if (version && version >= minVersion) return { path: candidate, version };
  }

  // Download a matching Java (Eclipse Temurin)
  const osName = { win32: 'windows', linux: 'linux', darwin: 'mac' }[process.platform];
  const arch = { x64: 'x64', arm64: 'aarch64' }[process.arch];
  if (!osName || !arch) throw new Error(t('ts.javaRequired', { version: minVersion }));
  setState({ message: t('ts.searchingJava', { version: minVersion }) });
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
  const archiveName = typeof pkg?.name === 'string' && /^[\w.+-]+$/.test(pkg.name) ? pkg.name : `java-${minVersion}${osName === 'windows' ? '.zip' : '.tar.gz'}`;
  const archive = path.join(downloadsDir(), archiveName);
  info(t('ts.javaNotFound', { version: minVersion }));
  await download(url, archive, `Java ${minVersion}`, pkg?.checksum);

  setState({ message: t('ts.extractingJava', { version: minVersion }) });
  const target = path.join(javaDir(), String(minVersion));
  await fsp.rm(target, { recursive: true, force: true });
  await fsp.mkdir(target, { recursive: true });
  // Windows: the built-in tar.exe (bsdtar) can extract ZIP files
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  await new Promise((resolve, reject) =>
    execFile(tar, ['-xf', archive, '-C', target], { windowsHide: true, timeout: 5 * 60_000 }, (err, _out, stderr) =>
      err ? reject(new Error(t('ts.javaExtractFailed', { error: stderr || err.message }))) : resolve(),
    ),
  );
  await fsp.rm(archive, { force: true });
  const javaPath = await findJavaIn(target);
  const version = javaPath ? await javaVersionOf(javaPath) : null;
  if (!javaPath || !version) throw new Error(t('ts.javaBroken'));
  return { path: javaPath, version };
}

/* ------------------------------------------------------------------ inspect Nexo JAR (read ZIP) */

function readZipEntry(buffer, wanted) {
  const minEocd = Math.max(0, buffer.length - 65_557);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= minEocd; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && offset + 46 <= buffer.length; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) return null;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (wanted.includes(name)) {
      const localName = buffer.readUInt16LE(localOffset + 26);
      const localExtra = buffer.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localName + localExtra;
      const data = buffer.subarray(start, start + compressedSize);
      return { name, text: (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8') };
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

function inspectPluginJar(buffer) {
  const entry = readZipEntry(buffer, ['paper-plugin.yml', 'plugin.yml']);
  if (!entry) return null;
  const field = (key) => new RegExp(`^${key}:\\s*['"]?([^'"\\r\\n]+)`, 'm').exec(entry.text)?.[1]?.trim() ?? '';
  return { name: field('name'), version: field('version'), apiVersion: field('api-version') };
}

async function chooseNexoJar(win) {
  let source = process.env.RESOURCEPACKBUILDER_TEST_NEXO_JAR; // automated tests only
  if (!source) {
    const result = await dialog.showOpenDialog(win, {
      title: t('ts.chooseNexoJar'),
      buttonLabel: t('ts.choose'),
      filters: [{ name: t('ts.pluginFilter'), extensions: ['jar'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    source = result.filePaths[0];
  }
  const buffer = await fsp.readFile(source);
  const plugin = inspectPluginJar(buffer);
  if (!plugin) throw new Error(t('ts.notAPlugin'));
  if (plugin.name.toLowerCase() !== 'nexo') throw new Error(t('ts.notNexo', { name: plugin.name }));
  const file = `Nexo-${plugin.version.replace(/[^\w.-]/g, '_') || 'unbekannt'}.jar`;
  await fsp.rm(pluginStore(), { recursive: true, force: true });
  await fsp.mkdir(pluginStore(), { recursive: true });
  await fsp.writeFile(path.join(pluginStore(), file), buffer);
  state.config = { ...state.config, nexoJar: { file, name: plugin.name, version: plugin.version } };
  await saveConfig();
  setState({});
  info(t('ts.nexoSelected', { version: plugin.version }));
  return state.config.nexoJar;
}

/* ------------------------------------------------------------------ set up server */

const DEFAULT_PROPERTIES = [
  '# Vom ResourcepackBuilder-Testserver angelegt – darf angepasst werden',
  'motd=ResourcepackBuilder Testserver',
  'server-port=25565',
  'online-mode=true',
  'gamemode=creative',
  'difficulty=peaceful',
  'level-type=minecraft\\:flat',
  'generator-settings={"biome"\\:"minecraft\\:plains","layers"\\:[{"block"\\:"minecraft\\:bedrock","height"\\:1},{"block"\\:"minecraft\\:dirt","height"\\:2},{"block"\\:"minecraft\\:grass_block","height"\\:1}]}',
  'generate-structures=false',
  'spawn-protection=0',
  'max-players=8',
  'view-distance=8',
  'simulation-distance=6',
  'allow-flight=true',
  'enable-command-block=true',
  '',
].join('\n');

async function prepareServerFiles() {
  await fsp.mkdir(path.join(serverDir(), 'plugins'), { recursive: true });
  await fsp.writeFile(
    path.join(serverDir(), 'eula.txt'),
    '# Die Minecraft-EULA (https://aka.ms/MinecraftEULA) wurde in ResourcepackBuilder akzeptiert.\neula=true\n',
  );
  const propsPath = path.join(serverDir(), 'server.properties');
  let props = fs.existsSync(propsPath) ? await fsp.readFile(propsPath, 'utf8') : DEFAULT_PROPERTIES;
  props = /^server-port=.*$/m.test(props)
    ? props.replace(/^server-port=.*$/m, `server-port=${state.config.port}`)
    : `${props.trimEnd()}\nserver-port=${state.config.port}\n`;
  await fsp.writeFile(propsPath, props);

  // Recommended by Nexo (otherwise custom blocks based on note blocks, tripwire, chorus break)
  const paperGlobal = path.join(serverDir(), 'config', 'paper-global.yml');
  if (fs.existsSync(paperGlobal)) {
    const text = await fsp.readFile(paperGlobal, 'utf8');
    const patched = text.replace(/^(\s+disable-(?:noteblock|tripwire|chorus-plant)-updates:)\s*false\s*$/gm, '$1 true');
    if (patched !== text) {
      await fsp.writeFile(paperGlobal, patched);
      info(t('ts.paperSettingsPatched'));
    }
  }
  // Cache of the obfuscated pack; can be corrupted after aborted runs
  for (const cache of [path.join(nexoDir(), 'pack', '.deobfCachedPacks'), path.join(nexoDir(), '.deobfCachedPacks')]) {
    await fsp.rm(cache, { recursive: true, force: true });
  }

  // Nexo plugin: exactly the selected version in plugins/
  const pluginsDir = path.join(serverDir(), 'plugins');
  const wanted = state.config.nexoJar?.file ?? null;
  for (const name of await fsp.readdir(pluginsDir)) {
    if (/^nexo.*\.jar$/i.test(name) && name !== wanted) await fsp.rm(path.join(pluginsDir, name), { force: true });
  }
  if (wanted) {
    const source = path.join(pluginStore(), wanted);
    if (!fs.existsSync(source)) throw new Error(t('ts.nexoJarMissing'));
    await fsp.copyFile(source, path.join(pluginsDir, wanted));
  }
}

/* ------------------------------------------------------------------ start / stop */

/* ------------------------------------------------------------------ watch Nexo resource pack */

// Nexo builds the pack in the background. A "nexo reload" in the meantime starts a second build
// in parallel, and both then fail (e.g. "items.json already exists"). That is why we wait.
const PACK_BUILD_TIMEOUT_MS = 3 * 60_000;
let reloadPending = false;
let packTimer = null;

function setPack(status, message = null) {
  clearTimeout(packTimer);
  packTimer = null;
  if (status === 'building') {
    packTimer = setTimeout(() => {
      info(t('ts.packTimeout'));
      setPack('idle');
    }, PACK_BUILD_TIMEOUT_MS);
  }
  setState({ pack: { status, message, at: Date.now() } });
  if (status !== 'building' && reloadPending && state.status === 'running') {
    reloadPending = false;
    setTimeout(() => requestReload(), 1000);
  }
}

/** Reloads Nexo, or schedules the reload while Nexo is still building the resource pack. */
function requestReload() {
  if (state.status !== 'running' || !proc) return false;
  if (state.pack.status === 'building') {
    if (!reloadPending) info(t('ts.reloadQueued'));
    reloadPending = true;
    return false;
  }
  const sent = sendCommand('nexo reload all');
  if (sent && state.config.nexoJar) setPack('building', t('ts.packReloading'));
  return sent;
}

function watchNexoPack(line) {
  if (!/Nexo/.test(line)) return;
  if (/Generating resourcepack/i.test(line)) {
    if (state.pack.status !== 'building') setPack('building', t('ts.packBuilding'));
    return;
  }
  const uploaded = /Resourcepack uploaded and will be dispatched with publicAddress\s*(\S*)|ResourcePack uploaded:\s*(\S*)/i.exec(line);
  if (uploaded) {
    setPack('ready', uploaded[1] || uploaded[2] || null);
    return;
  }
  const failed = /Failed to build and send the finished ResourcePack:\s*(.*)|Upload failed:\s*(.*)|could not be uploaded(.*)/i.exec(line);
  if (failed) setPack('failed', (failed[1] || failed[2] || failed[3] || '').trim() || t('ts.unknownError'));
}

function handleLine(line) {
  pushLog(line);
  watchNexoPack(line);
  if (state.status === 'starting' && /Done \([\d.,]+s\)! For help/.test(line)) {
    setState({ status: 'running', message: null, startedAt: Date.now() });
    if (state.config.playerName) sendCommand(`op ${state.config.playerName}`);
  }
  if (/FAILED TO BIND TO PORT/i.test(line)) {
    setState({ message: t('ts.portInUse', { port: state.config.port }) });
  }
}

function attachOutput(stream, kind) {
  let rest = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    const parts = (rest + chunk).split(/\r?\n/);
    rest = parts.pop() ?? '';
    for (const part of parts) if (part.trim()) (kind === 'err' ? pushLog(part, 'err') : handleLine(part));
  });
  stream.on('end', () => {
    if (rest.trim()) handleLine(rest);
  });
}

async function start() {
  await loadConfig();
  if (proc || ['preparing', 'starting', 'running', 'stopping'].includes(state.status)) return publicState();
  if (!state.config.eulaAccepted) throw new Error(t('ts.eulaRequired'));
  if (!state.config.paperVersion) throw new Error(t('ts.versionRequired'));
  stopRequested = false;
  setState({ status: 'preparing', message: t('ts.preparing'), progress: null });
  try {
    const paper = await ensurePaper(state.config.paperVersion);
    const java = await ensureJava(paper.javaMin);
    state.installed = { paperVersion: paper.version, paperBuild: paper.build, javaPath: java.path, javaVersion: java.version };
    await saveConfig();
    await prepareServerFiles();

    info(t('ts.startingPaper', { version: paper.version, java: java.version, ram: state.config.ramGb }));
    reloadPending = false;
    setState({ status: 'starting', message: t('ts.starting') });
    // Nexo builds the pack on startup; no reload until then
    if (state.config.nexoJar) setPack('building', t('ts.packBuildingOnStart'));
    else setPack('idle');
    const args = ['-Xms512M', `-Xmx${state.config.ramGb}G`, '-Dfile.encoding=UTF-8', '-jar', paper.jar, '--nogui'];
    const child = spawn(java.path, args, { cwd: serverDir(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    proc = child;
    attachOutput(child.stdout, 'out');
    attachOutput(child.stderr, 'err');
    child.stdin.on('error', () => undefined);
    child.on('error', (err) => {
      pushLog(t('ts.startFailed', { error: err.message }), 'err');
    });
    child.on('exit', (code) => {
      if (proc === child) proc = null;
      const expected = stopRequested;
      stopRequested = false;
      info(code !== null ? t('ts.exitedCode', { code }) : t('ts.exited'));
      reloadPending = false;
      setPack('idle');
      if (expected || code === 0) setState({ status: 'stopped', message: null, startedAt: null, progress: null });
      else setState({ status: 'error', message: state.message || t('ts.crashed', { code }), startedAt: null });
    });
  } catch (err) {
    pushLog(err.message, 'err');
    setState({ status: 'error', message: err.message, progress: null });
  }
  return publicState();
}

function sendCommand(command) {
  const text = String(command ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!text || !proc) return false;
  pushLog(`> ${text}`, 'info');
  proc.stdin.write(`${text}\n`);
  return true;
}

async function stop() {
  const child = proc;
  if (!child) {
    if (state.status !== 'stopped') setState({ status: 'stopped', message: null });
    return;
  }
  stopRequested = true;
  setState({ status: 'stopping', message: t('ts.stopping') });
  sendCommand('stop');
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      pushLog(t('ts.notResponding'), 'err');
      child.kill('SIGKILL');
      resolve();
    }, STOP_TIMEOUT_MS);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function isRunning() {
  return proc !== null;
}

/* ------------------------------------------------------------------ sync project files */

// sounds.yml/paintings.yml: plugins/Nexo has only a single file of each
const SYNC_PATH = /^((items|recipes|glyphs|pack\/external_packs)\/.+|sounds\.yml|paintings\.yml)$/;
const SAFE_SEGMENT = /^[A-Za-z0-9_.+-]+$/;

function syncTarget(rel) {
  if (typeof rel !== 'string' || !SYNC_PATH.test(rel)) throw new Error(t('ts.invalidPath', { path: rel }));
  const segments = rel.split('/');
  if (segments.some((s) => !SAFE_SEGMENT.test(s) || s === '.' || s === '..')) throw new Error(t('ts.invalidPath', { path: rel }));
  return path.join(nexoDir(), ...segments);
}

async function writeAtomic(target, data) {
  await fsp.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${crypto.randomBytes(3).toString('hex')}.tmp`;
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, target);
}

async function pruneEmptyDirs(dir) {
  const stopAt = nexoDir();
  let current = dir;
  while (current.startsWith(stopAt + path.sep) && current !== stopAt) {
    try {
      if ((await fsp.readdir(current)).length > 0) return;
      await fsp.rmdir(current);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}

/**
 * Writes the project's files to plugins/Nexo. Whatever was written last time and is now
 * missing (deleted items, a different project) is removed. Other files are left untouched.
 */
async function syncFiles(files, options = {}) {
  if (!Array.isArray(files)) throw new Error(t('ts.invalidFiles'));
  let manifest = {};
  try {
    manifest = JSON.parse(await fsp.readFile(manifestFile(), 'utf8'));
  } catch {
    // first sync
  }
  const next = {};
  let written = 0;
  let deleted = 0;
  let skipped = 0;
  for (const file of files) {
    let target;
    try {
      target = syncTarget(file.path);
    } catch {
      skipped++;
      pushLog(t('ts.skippedFile', { path: String(file.path) }), 'err');
      continue;
    }
    const data = typeof file.data === 'string' ? Buffer.from(file.data, 'utf8') : Buffer.from(file.data);
    const hash = crypto.createHash('sha1').update(data).digest('hex');
    next[file.path] = hash;
    if (manifest[file.path] !== hash || !fs.existsSync(target)) {
      await writeAtomic(target, data);
      written++;
    }
  }
  for (const rel of Object.keys(manifest)) {
    if (rel in next) continue;
    try {
      const target = syncTarget(rel);
      await fsp.rm(target, { force: true });
      await pruneEmptyDirs(path.dirname(target));
      deleted++;
    } catch {
      // invalid entry; ignore
    }
  }
  let settingsChanged = false;
  if (typeof options.settings === 'string') {
    const target = path.join(nexoDir(), 'settings.yml');
    const current = fs.existsSync(target) ? await fsp.readFile(target, 'utf8') : null;
    if (current !== options.settings) {
      await writeAtomic(target, options.settings);
      settingsChanged = true;
    }
  }
  await fsp.mkdir(rootDir(), { recursive: true });
  await fsp.writeFile(manifestFile(), JSON.stringify(next));
  const changed = written > 0 || deleted > 0 || settingsChanged;
  let reloaded = false;
  if (changed && options.reload && state.status === 'running') {
    reloaded = requestReload() || reloadPending;
  }
  if (changed) info(t(settingsChanged ? 'ts.syncedSettings' : 'ts.synced', { written, deleted }));
  state.lastSync = Date.now();
  setState({});
  return { written, deleted, skipped, settingsChanged, reloaded, total: files.length };
}

async function readNexoSettings() {
  try {
    return await fsp.readFile(path.join(nexoDir(), 'settings.yml'), 'utf8');
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ IPC */

function registerTestServerHandlers() {
  const handle = (channel, fn) =>
    ipcMain.handle(channel, async (event, ...args) => {
      const url = event.senderFrame?.url ?? '';
      if (!url.startsWith('app://bundle/')) throw new Error('Not allowed');
      await loadConfig();
      return fn(event, ...args);
    });

  handle('testserver:get-state', () => ({ ...publicState(), log: log.slice(-1000) }));
  handle('testserver:set-config', async (_event, patch) => {
    state.config = { ...state.config, ...cleanConfigPatch(patch) };
    await saveConfig();
    setState({});
    return publicState();
  });
  handle('testserver:versions', () => paperVersions());
  handle('testserver:choose-nexo-jar', (event) => chooseNexoJar(BrowserWindow.fromWebContents(event.sender)));
  handle('testserver:start', () => start());
  handle('testserver:stop', () => stop().then(() => publicState()));
  handle('testserver:command', (_event, command) => {
    const sent = sendCommand(command);
    // A manually entered reload also rebuilds the pack
    if (sent && state.config.nexoJar && /^\/?(nexo|n)\s+(reload|rl)\b/i.test(String(command).trim())) {
      setPack('building', t('ts.packReloading'));
    }
    return sent;
  });
  handle('testserver:reload', () => requestReload());
  handle('testserver:sync', (_event, files, options) => syncFiles(files, options));
  handle('testserver:read-settings', () => readNexoSettings());
  handle('testserver:open-folder', async () => {
    await fsp.mkdir(serverDir(), { recursive: true });
    const error = await shell.openPath(serverDir());
    if (error) throw new Error(error);
  });
  handle('testserver:clear-log', () => {
    log = [];
    return true;
  });
}

module.exports = { registerTestServerHandlers, stopTestServer: stop, isTestServerRunning: isRunning };
