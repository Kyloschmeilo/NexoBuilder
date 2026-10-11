/**
 * Lokaler Testserver (Paper + Nexo) für NexoBuilder.
 *
 * - lädt Paper (PaperMC) und bei Bedarf Java (Eclipse Temurin) herunter
 * - richtet den Server ein (EULA erst nach Zustimmung, server.properties, Nexo-Plugin)
 * - startet ihn als Kindprozess und reicht die Konsole an die Oberfläche weiter
 * - schreibt die Projektdateien nach plugins/Nexo und lädt Nexo danach neu
 *
 * Alles liegt in <AppDaten>/testserver. Die Nexo-JAR bringt die Person selbst mit –
 * sie wird nur in diesen Ordner kopiert, nie weitergegeben.
 */
const { app, BrowserWindow, dialog, ipcMain, net, shell } = require('electron');
const { execFile, spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const zlib = require('node:zlib');

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

/* ------------------------------------------------------------------ Pfade */

const rootDir = () => process.env.NEXOBUILDER_TESTSERVER_DIR || path.join(app.getPath('userData'), 'testserver');
const serverDir = () => path.join(rootDir(), 'server');
const nexoDir = () => path.join(serverDir(), 'plugins', 'Nexo');
const downloadsDir = () => path.join(rootDir(), 'downloads');
const javaDir = () => path.join(rootDir(), 'java');
const pluginStore = () => path.join(rootDir(), 'nexo-plugin');
const configFile = () => path.join(rootDir(), 'testserver.json');
const manifestFile = () => path.join(rootDir(), 'sync-manifest.json');

const userAgent = () => `NexoBuilder/${app.getVersion()} (https://github.com/Kyloschmeilo/NexoBuilder)`;

/* ------------------------------------------------------------------ Zustand */

const state = {
  status: 'stopped', // stopped | preparing | starting | running | stopping | error
  message: null,
  progress: null,
  config: { ...DEFAULT_CONFIG },
  installed: null, // { paperVersion, paperBuild, javaPath, javaVersion }
  startedAt: null,
  lastSync: null,
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
    // erster Start
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
    // keine JSON-Antwort
  }
  if (!res.ok) throw new Error(data?.message ? `${data.message} (${res.status})` : `Anfrage fehlgeschlagen (${res.status}): ${url}`);
  return data;
}

async function download(url, dest, label, expectedSha256) {
  const res = await net.fetch(url, { headers: { 'User-Agent': userAgent() } });
  if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen (${res.status}): ${label}`);
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
        setState({ message: `${label} wird heruntergeladen …${percent !== null ? ` ${percent} %` : ''}`, progress: percent });
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
    throw new Error(`${label}: Prüfsumme stimmt nicht – Download beschädigt. Bitte erneut versuchen.`);
  }
  await fsp.rename(tmp, dest);
  setState({ progress: null });
}

/* ------------------------------------------------------------------ Paper */

let versionsCache = null;

async function paperVersions() {
  if (process.env.NEXOBUILDER_TEST_PAPER_JAR) return [process.env.NEXOBUILDER_TEST_PAPER_VERSION || '1.21.11'];
  if (versionsCache && Date.now() - versionsCache.time < 10 * 60_000) return versionsCache.list;
  const data = await fetchJson(PAPER_API);
  const groups = data && typeof data.versions === 'object' ? Object.values(data.versions) : [];
  const list = groups.flat().filter((v) => typeof v === 'string');
  versionsCache = { time: Date.now(), list };
  return list;
}

/** Mindest-Java-Version, falls die Paper-Schnittstelle keine nennt */
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
  const testJar = process.env.NEXOBUILDER_TEST_PAPER_JAR; // nur für automatische Tests
  if (testJar) return { jar: testJar, version: version || 'test', build: 0, javaMin: 17 };

  setState({ message: `Suche Paper ${version} …` });
  const builds = await fetchJson(`${PAPER_API}/versions/${encodeURIComponent(version)}/builds`);
  if (!Array.isArray(builds) || builds.length === 0) throw new Error(`Für Minecraft ${version} gibt es keinen Paper-Build.`);
  const stable = builds.filter((b) => b && b.channel === 'STABLE');
  const pool = stable.length ? stable : builds;
  const pick = pool.reduce((best, b) => (!best || Number(b.id) > Number(best.id) ? b : best), null);
  const dl = pick?.downloads?.['server:default'];
  if (!dl?.url) throw new Error(`Paper ${version}: kein Download gefunden.`);
  if (!stable.length) info(`Hinweis: Für Paper ${version} gibt es nur einen experimentellen Build (#${pick.id}).`);

  let javaMin = guessJavaFor(version);
  try {
    const meta = await fetchJson(`${PAPER_API}/versions/${encodeURIComponent(version)}`);
    const min = meta?.version?.java?.version?.minimum ?? meta?.java?.version?.minimum;
    if (Number.isInteger(min) && min > 0) javaMin = min;
  } catch {
    // Schätzung reicht
  }

  const name = typeof dl.name === 'string' && /^[\w.-]+\.jar$/.test(dl.name) ? dl.name : `paper-${version}-${pick.id}.jar`;
  const dest = path.join(downloadsDir(), name);
  if (!fs.existsSync(dest)) {
    info(`Lade Paper ${version} (Build ${pick.id}) herunter …`);
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
  if (!process.env.NEXOBUILDER_TEST_IGNORE_SYSTEM_JAVA) {
    if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, 'bin', javaExecutableName()));
    candidates.push('java');
  }
  for (const candidate of candidates) {
    const version = await javaVersionOf(candidate);
    if (version && version >= minVersion) return { path: candidate, version };
  }

  // Passendes Java (Eclipse Temurin) herunterladen
  const osName = { win32: 'windows', linux: 'linux', darwin: 'mac' }[process.platform];
  const arch = { x64: 'x64', arm64: 'aarch64' }[process.arch];
  if (!osName || !arch) throw new Error(`Java ${minVersion} wird benötigt. Bitte selbst installieren.`);
  setState({ message: `Suche Java ${minVersion} …` });
  let pkg = null;
  try {
    const assets = await fetchJson(
      `${ADOPTIUM_API}/assets/latest/${minVersion}/hotspot?architecture=${arch}&image_type=jre&os=${osName}&vendor=eclipse`,
    );
    pkg = Array.isArray(assets) ? assets[0]?.binary?.package : null;
  } catch {
    // Fallback auf den direkten Download-Link
  }
  const url = pkg?.link || `${ADOPTIUM_API}/binary/latest/${minVersion}/ga/${osName}/${arch}/jre/hotspot/normal/eclipse`;
  const archiveName = typeof pkg?.name === 'string' && /^[\w.+-]+$/.test(pkg.name) ? pkg.name : `java-${minVersion}${osName === 'windows' ? '.zip' : '.tar.gz'}`;
  const archive = path.join(downloadsDir(), archiveName);
  info(`Java ${minVersion} wurde nicht gefunden – lade Eclipse Temurin ${minVersion} herunter …`);
  await download(url, archive, `Java ${minVersion}`, pkg?.checksum);

  setState({ message: `Java ${minVersion} wird entpackt …` });
  const target = path.join(javaDir(), String(minVersion));
  await fsp.rm(target, { recursive: true, force: true });
  await fsp.mkdir(target, { recursive: true });
  // Windows: das eingebaute tar.exe (bsdtar) kann ZIP entpacken
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  await new Promise((resolve, reject) =>
    execFile(tar, ['-xf', archive, '-C', target], { windowsHide: true, timeout: 5 * 60_000 }, (err, _out, stderr) =>
      err ? reject(new Error(`Java konnte nicht entpackt werden: ${stderr || err.message}`)) : resolve(),
    ),
  );
  await fsp.rm(archive, { force: true });
  const javaPath = await findJavaIn(target);
  const version = javaPath ? await javaVersionOf(javaPath) : null;
  if (!javaPath || !version) throw new Error('Das heruntergeladene Java funktioniert nicht.');
  return { path: javaPath, version };
}

/* ------------------------------------------------------------------ Nexo-JAR prüfen (ZIP lesen) */

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
  let source = process.env.NEXOBUILDER_TEST_NEXO_JAR; // nur für automatische Tests
  if (!source) {
    const result = await dialog.showOpenDialog(win, {
      title: 'Nexo-Plugin (JAR) auswählen',
      buttonLabel: 'Auswählen',
      filters: [{ name: 'Minecraft-Plugin', extensions: ['jar'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    source = result.filePaths[0];
  }
  const buffer = await fsp.readFile(source);
  const plugin = inspectPluginJar(buffer);
  if (!plugin) throw new Error('Das ist keine gültige Plugin-Datei (paper-plugin.yml fehlt).');
  if (plugin.name.toLowerCase() !== 'nexo') throw new Error(`Das ist nicht Nexo, sondern „${plugin.name}“.`);
  const file = `Nexo-${plugin.version.replace(/[^\w.-]/g, '_') || 'unbekannt'}.jar`;
  await fsp.rm(pluginStore(), { recursive: true, force: true });
  await fsp.mkdir(pluginStore(), { recursive: true });
  await fsp.writeFile(path.join(pluginStore(), file), buffer);
  state.config = { ...state.config, nexoJar: { file, name: plugin.name, version: plugin.version } };
  await saveConfig();
  setState({});
  info(`Nexo ${plugin.version} ausgewählt.`);
  return state.config.nexoJar;
}

/* ------------------------------------------------------------------ Server einrichten */

const DEFAULT_PROPERTIES = [
  '# Vom NexoBuilder-Testserver angelegt – darf angepasst werden',
  'motd=NexoBuilder Testserver',
  'server-port=25565',
  'online-mode=true',
  'gamemode=creative',
  'difficulty=peaceful',
  'level-type=minecraft\\:flat',
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
    '# Die Minecraft-EULA (https://aka.ms/MinecraftEULA) wurde in NexoBuilder akzeptiert.\neula=true\n',
  );
  const propsPath = path.join(serverDir(), 'server.properties');
  let props = fs.existsSync(propsPath) ? await fsp.readFile(propsPath, 'utf8') : DEFAULT_PROPERTIES;
  props = /^server-port=.*$/m.test(props)
    ? props.replace(/^server-port=.*$/m, `server-port=${state.config.port}`)
    : `${props.trimEnd()}\nserver-port=${state.config.port}\n`;
  await fsp.writeFile(propsPath, props);

  // Nexo-Plugin: genau die ausgewählte Version in plugins/
  const pluginsDir = path.join(serverDir(), 'plugins');
  const wanted = state.config.nexoJar?.file ?? null;
  for (const name of await fsp.readdir(pluginsDir)) {
    if (/^nexo.*\.jar$/i.test(name) && name !== wanted) await fsp.rm(path.join(pluginsDir, name), { force: true });
  }
  if (wanted) {
    const source = path.join(pluginStore(), wanted);
    if (!fs.existsSync(source)) throw new Error('Die Nexo-JAR fehlt. Bitte erneut auswählen.');
    await fsp.copyFile(source, path.join(pluginsDir, wanted));
  }
}

/* ------------------------------------------------------------------ Starten / Stoppen */

function handleLine(line) {
  pushLog(line);
  if (state.status === 'starting' && /Done \([\d.,]+s\)! For help/.test(line)) {
    setState({ status: 'running', message: null, startedAt: Date.now() });
    if (state.config.playerName) sendCommand(`op ${state.config.playerName}`);
  }
  if (/FAILED TO BIND TO PORT/i.test(line)) {
    setState({ message: `Port ${state.config.port} ist belegt – läuft schon ein anderer Minecraft-Server?` });
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
  if (!state.config.eulaAccepted) throw new Error('Bitte zuerst die Minecraft-EULA akzeptieren.');
  if (!state.config.paperVersion) throw new Error('Bitte eine Minecraft-Version wählen.');
  stopRequested = false;
  setState({ status: 'preparing', message: 'Bereite den Testserver vor …', progress: null });
  try {
    const paper = await ensurePaper(state.config.paperVersion);
    const java = await ensureJava(paper.javaMin);
    state.installed = { paperVersion: paper.version, paperBuild: paper.build, javaPath: java.path, javaVersion: java.version };
    await saveConfig();
    await prepareServerFiles();

    info(`Starte Paper ${paper.version} mit Java ${java.version} (${state.config.ramGb} GB RAM) …`);
    setState({ status: 'starting', message: 'Server startet …' });
    const args = ['-Xms512M', `-Xmx${state.config.ramGb}G`, '-Dfile.encoding=UTF-8', '-jar', paper.jar, '--nogui'];
    const child = spawn(java.path, args, { cwd: serverDir(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    proc = child;
    attachOutput(child.stdout, 'out');
    attachOutput(child.stderr, 'err');
    child.stdin.on('error', () => undefined);
    child.on('error', (err) => {
      pushLog(`Server konnte nicht gestartet werden: ${err.message}`, 'err');
    });
    child.on('exit', (code) => {
      if (proc === child) proc = null;
      const expected = stopRequested;
      stopRequested = false;
      info(`Server beendet${code !== null ? ` (Code ${code})` : ''}.`);
      if (expected || code === 0) setState({ status: 'stopped', message: null, startedAt: null, progress: null });
      else setState({ status: 'error', message: state.message || `Der Server wurde unerwartet beendet (Code ${code}). Details in der Konsole.`, startedAt: null });
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
  setState({ status: 'stopping', message: 'Server wird gestoppt (Welt wird gespeichert) …' });
  sendCommand('stop');
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      pushLog('Server reagiert nicht – wird beendet.', 'err');
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

/* ------------------------------------------------------------------ Projektdateien abgleichen */

const SYNC_PATH = /^(items|recipes|glyphs|pack\/external_packs)\/.+$/;
const SAFE_SEGMENT = /^[A-Za-z0-9_.+-]+$/;

function syncTarget(rel) {
  if (typeof rel !== 'string' || !SYNC_PATH.test(rel)) throw new Error(`Ungültiger Pfad: ${rel}`);
  const segments = rel.split('/');
  if (segments.some((s) => !SAFE_SEGMENT.test(s) || s === '.' || s === '..')) throw new Error(`Ungültiger Pfad: ${rel}`);
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
 * Schreibt die Dateien des Projekts nach plugins/Nexo. Was beim letzten Mal geschrieben wurde und
 * jetzt fehlt (gelöschte Items, anderes Projekt), wird entfernt. Andere Dateien bleiben unberührt.
 */
async function syncFiles(files, options = {}) {
  if (!Array.isArray(files)) throw new Error('Ungültige Dateien');
  let manifest = {};
  try {
    manifest = JSON.parse(await fsp.readFile(manifestFile(), 'utf8'));
  } catch {
    // erster Abgleich
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
      pushLog(`Übersprungen (ungültiger Dateiname): ${String(file.path)}`, 'err');
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
      // ungültiger Eintrag – ignorieren
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
    reloaded = sendCommand('nexo reload all');
  }
  if (changed) info(`Projekt übertragen: ${written} geschrieben, ${deleted} entfernt${settingsChanged ? ', Einstellungen angepasst' : ''}.`);
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
      if (!url.startsWith('file:')) throw new Error('Nicht erlaubt');
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
  handle('testserver:command', (_event, command) => sendCommand(command));
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
