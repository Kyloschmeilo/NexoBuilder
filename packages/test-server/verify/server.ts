/**
 * A throwaway Paper server for the plugin check: downloads Paper (PaperMC fill API, sha256-checked) and the CraftEngine
 * JAR (Modrinth, sha512-checked, picked the way the desktop program picks it), sets up a server folder with an offline,
 * low-distance world, installs the exported project the way the test-server sync does, and runs the server headless
 * while recording its console.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import type { PackTargetId, Project } from '@resourcepackbuilder/core/project';
import { parseDocument } from 'yaml';
import { exportPackName, planExport } from '@resourcepackbuilder/export';
import {
  craftEngineVersionsUrl,
  DEFAULT_SERVER_PROPERTIES,
  EULA_TEXT,
  INSTALLED_PLUGIN_JAR_PATTERNS,
  modrinthVersionsSchema,
  parseServerLogLine,
  patchPaperGlobal,
  pickCraftEngineVersion,
  pluginFolderFiles,
  serverAdapterFor,
  setProperty,
  stripAnsi,
  type ServerFile,
  type ServerLogEvent,
} from '../src';

const PAPER_API = 'https://fill.papermc.io/v3/projects/paper';

/** Fetches JSON or fails with the URL in the message. */
async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { 'User-Agent': 'ResourcepackBuilder plugin check' } });
  if (!response.ok) throw new Error(`GET ${url}: ${response.status}`);
  return response.json();
}

/** Downloads `url` to `file` unless a file with the expected hash is there already; the hash is checked either way. */
async function downloadChecked(url: string, file: string, algorithm: 'sha256' | 'sha512', expected: string): Promise<void> {
  const hashOf = (data: Buffer) => createHash(algorithm).update(data).digest('hex');
  if (fs.existsSync(file) && hashOf(fs.readFileSync(file)) === expected.toLowerCase()) return;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url}: ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  const actual = hashOf(data);
  if (actual !== expected.toLowerCase()) throw new Error(`${path.basename(file)}: ${algorithm} ${actual} does not match ${expected}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

interface PaperBuildEntry {
  id: number;
  channel: string;
  downloads: Record<string, { name: string; url: string; checksums: { sha256: string } }>;
}

/** The newest stable Paper build of `version` (the newest of any channel when none is stable), downloaded into `jarDir`. */
export async function ensurePaperJar(version: string, jarDir: string): Promise<{ jar: string; build: number }> {
  const builds = (await fetchJson(`${PAPER_API}/versions/${encodeURIComponent(version)}/builds`)) as PaperBuildEntry[];
  const stable = builds.filter((build) => build.channel === 'STABLE');
  const pool = stable.length > 0 ? stable : builds;
  const build = pool.reduce<PaperBuildEntry | null>((best, entry) => (!best || entry.id > best.id ? entry : best), null);
  const download = build?.downloads['server:default'];
  if (!build || !download) throw new Error(`No Paper build for ${version}`);
  const jar = path.join(jarDir, `paper-${version}-${build.id}.jar`);
  await downloadChecked(download.url, jar, 'sha256', download.checksums.sha256);
  return { jar, build: build.id };
}

/** The CraftEngine JAR for `paperVersion` from Modrinth, as the test server picks it, downloaded into `jarDir`. */
export async function ensureCraftEngineJar(paperVersion: string, jarDir: string): Promise<{ jar: string; version: string }> {
  const versions = modrinthVersionsSchema.parse(await fetchJson(craftEngineVersionsUrl(paperVersion)));
  const picked = pickCraftEngineVersion(versions, paperVersion);
  if (!picked) throw new Error(`No CraftEngine version supports Paper ${paperVersion}`);
  const jar = path.join(jarDir, picked.filename);
  await downloadChecked(picked.url, jar, 'sha512', picked.sha512);
  return { jar, version: picked.version };
}

/** A free TCP port on this machine. */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('No port'))));
    });
  });
}

export interface ServerSetup {
  dir: string;
  target: PackTargetId;
  paperJar: string;
  pluginJar: string;
  port: number;
  packPort: number;
}

/**
 * Creates the server folder: eula.txt, server.properties of the test server (offline, the free `port`, short view and
 * simulation distance) and the plugin JAR in plugins/. The folder must be new or one this script made before.
 */
export function prepareServerDir(setup: ServerSetup): void {
  fs.mkdirSync(path.join(setup.dir, 'plugins'), { recursive: true });
  fs.writeFileSync(path.join(setup.dir, 'eula.txt'), EULA_TEXT);
  let properties = DEFAULT_SERVER_PROPERTIES;
  const overrides: Array<[string, string]> = [
    ['server-port', String(setup.port)],
    ['online-mode', 'false'],
    ['view-distance', '2'],
    ['simulation-distance', '2'],
    ['motd', 'ResourcepackBuilder plugin check'],
  ];
  for (const [key, value] of overrides) properties = setProperty(properties, key, value);
  fs.writeFileSync(path.join(setup.dir, 'server.properties'), properties);
  // Other JARs of the same plugin (an older version, another file name) would make the plugin ambiguous
  const pluginsDir = path.join(setup.dir, 'plugins');
  for (const file of fs.readdirSync(pluginsDir)) {
    if (INSTALLED_PLUGIN_JAR_PATTERNS[setup.target].test(file) && file !== path.basename(setup.pluginJar)) {
      fs.rmSync(path.join(pluginsDir, file), { force: true });
    }
  }
  fs.copyFileSync(setup.pluginJar, path.join(pluginsDir, path.basename(setup.pluginJar)));
}

export interface ExportedProject {
  project: Project;
  /** The plugin folder files of the export (resource pack as a folder), as the test server syncs them */
  files: ServerFile[];
  /** The export's own issues, one line each: level, code, arguments and where */
  issues: string[];
}

/**
 * Exports the project the way the app's test-server sync does (export plan, then the plugin folder files) and writes
 * every file into `exportDir`, with the plan's issues in issues.json.
 */
export function exportProject(project: Project, exportDir: string): ExportedProject {
  const plan = planExport(project, { includeBinaries: true });
  const files = pluginFolderFiles(project, plan);
  fs.rmSync(exportDir, { recursive: true, force: true });
  for (const file of files) {
    const exported = path.join(exportDir, ...file.path.split('/'));
    fs.mkdirSync(path.dirname(exported), { recursive: true });
    fs.writeFileSync(exported, fileData(file));
  }
  fs.writeFileSync(path.join(exportDir, 'issues.json'), JSON.stringify(plan.issues, null, 2));
  const issues = plan.issues.map((issue) => {
    const item = issue.target?.kind === 'item' ? project.items[issue.target.id]?.itemId : issue.target?.id;
    const where = [item, ...(issue.context ?? []).map((frame) => `${frame.code} ${JSON.stringify(frame.args ?? {})}`)].filter(Boolean);
    return `${issue.level} ${issue.code} ${JSON.stringify(issue.args ?? {})} at ${where.join(' › ')}`;
  });
  return { project, files, issues };
}

const fileData = (file: ServerFile) => (typeof file.data === 'string' ? file.data : Buffer.from(file.data));

export interface InstallResult {
  /** Files written into the plugin folder (paths relative to it) */
  written: string[];
  /** Files the adapter refuses to sync (the test server would never write them) */
  refused: string[];
}

/**
 * Installs an exported project into the server the way the test-server sync does: each plugin folder file whose path
 * the adapter allows, the patched plugin config (plus `extraSettings` only this check sets) and Paper's
 * paper-global.yml values.
 */
export function installProject(
  setup: ServerSetup,
  { project, files }: ExportedProject,
  { extraSettings, ...options }: { attributes: boolean; scripting: boolean; extraSettings: Array<[string[], unknown]> },
): InstallResult {
  const adapter = serverAdapterFor(setup.target);
  const pluginDir = path.join(setup.dir, ...adapter.pluginDir.split('/'));
  const packName = exportPackName(project);
  const result: InstallResult = { written: [], refused: [] };
  // Files of the previous install go first (the app's sync deletes files the project no longer exports, too)
  const manifest = path.join(setup.dir, 'verify-installed.json');
  const previous: string[] = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : [];
  for (const file of previous) fs.rmSync(path.join(pluginDir, ...file.split('/')), { force: true });
  for (const file of files) {
    const segments = adapter.syncPathSegments(file.path, { packName });
    if (!segments) {
      result.refused.push(file.path);
      continue;
    }
    const target = path.join(pluginDir, ...segments);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, fileData(file));
    result.written.push(file.path);
  }
  fs.writeFileSync(manifest, JSON.stringify(result.written));

  const configFile = path.join(pluginDir, adapter.configFile);
  const current = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : null;
  const patched = adapter.patchConfig(current, { packPort: setup.packPort, ...options }) || current || '';
  // Values only this check sets (e.g. Nexo's debug output), on top of what the test server sets
  const doc = parseDocument(patched);
  for (const [keys, value] of extraSettings) doc.setIn(keys, value);
  fs.writeFileSync(configFile, extraSettings.length > 0 ? doc.toString({ lineWidth: 0 }) : patched);
  const paperGlobal = path.join(setup.dir, 'config', 'paper-global.yml');
  if (fs.existsSync(paperGlobal)) {
    const next = patchPaperGlobal(fs.readFileSync(paperGlobal, 'utf8'), adapter.paperGlobalOverrides);
    if (next) fs.writeFileSync(paperGlobal, next);
  }
  return result;
}

/** A running server: its console so far and a way to wait for lines and send commands. */
export class RunningServer {
  readonly lines: string[] = [];
  private readonly listeners = new Set<(line: string, event: ServerLogEvent | null) => void>();
  private readonly exited: Promise<number | null>;
  private hasExited = false;

  private constructor(
    private readonly process: ChildProcessWithoutNullStreams,
    private readonly target: PackTargetId,
    logFile: string,
  ) {
    const log = fs.createWriteStream(logFile);
    let pending = '';
    const onData = (chunk: Buffer) => {
      pending += chunk.toString('utf8');
      const parts = pending.split(/\r?\n/);
      pending = parts.pop() ?? '';
      for (const raw of parts) {
        const line = stripAnsi(raw);
        this.lines.push(line);
        log.write(line + '\n');
        const event = parseServerLogLine(serverAdapterFor(this.target), line);
        for (const listener of this.listeners) listener(line, event);
      }
    };
    process.stdout.on('data', onData);
    process.stderr.on('data', onData);
    this.exited = new Promise((resolve) => {
      const done = (code: number | null) => {
        if (this.hasExited) return;
        this.hasExited = true;
        log.end();
        resolve(code);
      };
      process.on('exit', done);
      // No java on the PATH (ENOENT): the process never starts and emits no 'exit'
      process.on('error', (error) => {
        console.error(`Could not run java: ${error.message}`);
        done(null);
      });
    });
    // A command sent after the server exited would fail with EPIPE; there is nothing left to tell
    process.stdin.on('error', () => {});
  }

  /** Starts Paper in `dir` with `ramGb` of memory, without its GUI. */
  static start(dir: string, paperJar: string, target: PackTargetId, logFile: string, ramGb = 3): RunningServer {
    // UTF-8 console: the plugins print MiniMessage symbols ("»") that the Windows code page garbles
    const args = [`-Xmx${ramGb}G`, '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8', '-jar', paperJar, '--nogui'];
    const child = spawn('java', args, { cwd: dir });
    return new RunningServer(child, target, logFile);
  }

  /** The process id (to check it is gone afterwards). */
  get pid(): number | undefined {
    return this.process.pid;
  }

  /** Resolves with the first line (after now) that `match` accepts; rejects after `timeoutMs` or when the server exits. */
  waitFor(match: (line: string, event: ServerLogEvent | null) => boolean, timeoutMs: number, what: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => (this.listeners.delete(listener), reject(new Error(`Timed out waiting for ${what}`))), timeoutMs);
      const listener = (line: string, event: ServerLogEvent | null) => {
        if (!match(line, event)) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolve(line);
      };
      this.listeners.add(listener);
      void this.exited.then(() => {
        if (!this.listeners.has(listener)) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        reject(new Error(`The server exited while waiting for ${what}`));
      });
    });
  }

  /** Sends a console command. */
  command(command: string): void {
    if (!this.hasExited && this.process.stdin.writable) this.process.stdin.write(command + '\n');
  }

  /** Stops the server ("stop", then a kill after `timeoutMs`) and resolves with its exit code. */
  async stop(timeoutMs = 90_000): Promise<number | null> {
    if (this.hasExited) return this.exited;
    this.command('stop');
    const timer = setTimeout(() => this.process.kill('SIGKILL'), timeoutMs);
    const code = await this.exited;
    clearTimeout(timer);
    return code;
  }
}
