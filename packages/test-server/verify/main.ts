/**
 * Plugin check: exports a sample project per target that uses many of the app's features, installs it into a real
 * Paper server with the target's plugin (Nexo from a JAR the user supplies, CraftEngine from Modrinth), starts the
 * server headless, reloads the plugin, stops it and reports every console line that may concern the exported configs.
 *
 * Usage (from the repository root):
 *   npm run verify:plugins -- --out <dir> [--target nexo|craftengine|all] [--nexo-jar <file>] [--paper <version>] [--fresh]
 *     [--export-only]
 *
 * Needs `java` on the PATH in the version Paper asks for (Java 25 for Minecraft 26.x) and network access (Paper,
 * Mojang's server JAR, CraftEngine and the libraries the plugins load on first start).
 *
 * `--out` must be a folder only this check uses: it holds the downloads (jars/) and, per target and version, the
 * server folder (<target>-<version>-server/), the exported files (…-export/) and the logs (…-first.log for the first
 * start that writes the default files, …-run.log, …-findings.txt). The exit code is 0 when the plugin reported nothing
 * about the project, 1 when it did (or the export had errors or the test server would refuse a file), 2 on a failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PACK_TARGETS, type PackTargetId, type Project } from '@resourcepackbuilder/core/project';
import { compareVersions, DEFAULT_MC_VERSION, getMcVersion } from '@resourcepackbuilder/minecraft';
import { craftEngineUsesAttributes, craftEngineUsesScripts } from '@resourcepackbuilder/core/craftEngine';
import { PAPER_VERSION_PATTERN, serverAdapterFor } from '../src';
import { formatFindings, scanLog, type LogRules } from './logScan';
import { craftEngineSample } from './samples/craftEngine';
import { nexoSample } from './samples/nexo';
import {
  ensureCraftEngineJar,
  ensurePaperJar,
  exportProject,
  freePort,
  installProject,
  prepareServerDir,
  RunningServer,
  type ServerSetup,
} from './server';

const STARTUP_TIMEOUT_MS = 10 * 60_000;
const PACK_TIMEOUT_MS = 4 * 60_000;
/** Lines after the pack build that may still report something (late tasks, async loaders) */
const SETTLE_MS = 8_000;

/** Console lines that never concern the exported configs. */
const NOISE: readonly RegExp[] = [
  /OFFLINE\/INSECURE MODE|The server will make no attempt to authenticate|makes the game possible to play without internet|set "online-mode" to "true"/,
  /Advanced terminal features are not available/,
  /\[MavenLibraryResolver\]/,
  /\[spark\]/,
  // Paper's note that a newer Minecraft version exists (runs for an older version)
  /WARN\]: \*{20,}$|You are running the latest build for your Minecraft version|release\(s\) behind the latest stable release|update as soon as possible|papermc\.io\/downloads\/paper/,
];

/** What the log scan reads as the plugin's own lines and its ordinary progress, per target. */
const RULES: Record<PackTargetId, LogRules> = {
  nexo: {
    pluginLine: /^(Nexo \||\[Nexo\])/,
    ordinary: [
      /^\[Nexo\] (Loading server plugin|Enabling|Disabling) Nexo/,
      /^Nexo \| (NMS-Version .* has been detected|Skipped downloading DefaultPack|(Finished )?[Ee]xtracting latest vanilla-resourcepack|PackServer set to|Started Self-Host|Stopping Self-Host|Generating resourcepack|Importing (DefaultPack|external-pack)|Validating ResourcePack files|Copied generated ResourcePack|Finished generating resourcepack|Resourcepack has been uploaded|Successfully (re|un)loaded|Resourcepack successfully regenerated|Cancelling generation of Nexo ResourcePack|Loaded \d+ multipack template\(s\)|Building TemplatePacks|Resourcepack uploaded and will be dispatched)/,
    ],
    noise: NOISE,
    known: [
      {
        // NexoConverter: an id like <set>_chestplate with an equippable component and no CustomArmor section makes Nexo look
        // for the pre-1.21.2 texture <set>_armor_layer_1.png; the app writes the equipment model itself, which works
        pattern: /looks like custom armor from the old naming-scheme|Custom armor is now only set up through a CustomArmor-section/,
        reason: 'Nexo naming heuristic for <set>_chestplate/_leggings/_boots ids; the app equips them through its own equipment model',
      },
      { pattern: /\[Nexo\] Registered JukeboxSong for id/, reason: 'Nexo logs each registered jukebox song at ERROR level' },
      {
        // Nexo 1.30 calls BlocksAttacks.Builder#bypassedBy(RegistryKeySet), which Paper 1.21.11 does not have
        pattern: /BlocksAttacks\$Builder\.bypassedBy|ERROR BUILDING ITEM "verify_shield"/,
        below: '26.1',
        reason: 'Nexo 1.30 bug on Paper 1.21.11: blocks_attacks calls a Paper API method that only newer Paper has',
      },
    ],
  },
  craftengine: {
    pluginLine: /^\[CraftEngine\]/,
    ordinary: [
      /^\[CraftEngine\] (Loading server plugin|Enabling|Disabling|Moonrise lifecycle|Initializing registries|Netty HTTP server started|Loaded pack: |Loaded [a-z ]+ in [\d,.]+ ?ms|Generating resource pack|Generated resource pack|Validating resource pack|Validated resource pack|Compressing resource pack|Compressed resource pack|Initiating resource pack upload|JS engine: |Downloading dependency |Successfully downloaded |Successfully uploaded resource pack|You're running the latest version|Saving|Saved|Closing|Shutting)/,
    ],
    noise: NOISE,
    known: [],
  },
};

interface Options {
  out: string;
  targets: PackTargetId[];
  nexoJar: string | null;
  paper: string;
  fresh: boolean;
  /** Only export the samples (no download, no server) */
  exportOnly: boolean;
}

function parseArgs(argv: string[]): Options {
  const value = (name: string) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const out = value('--out');
  if (!out) throw new Error('Missing --out <dir>');
  const target = value('--target') ?? 'all';
  if (target !== 'all' && !(PACK_TARGETS as readonly string[]).includes(target)) throw new Error(`Unknown --target ${target}`);
  const targets: PackTargetId[] = target === 'all' ? [...PACK_TARGETS] : [target as PackTargetId];
  // The version names folders that are deleted and recreated, so it must be a plain version
  const paper = value('--paper') ?? DEFAULT_MC_VERSION;
  if (!PAPER_VERSION_PATTERN.test(paper) || paper.includes('..')) throw new Error(`Not a Minecraft version: --paper ${paper}`);
  return {
    out: path.resolve(out),
    targets,
    nexoJar: value('--nexo-jar') ?? null,
    paper,
    fresh: argv.includes('--fresh'),
    exportOnly: argv.includes('--export-only'),
  };
}

/**
 * The multipack template packs the project names, as the user would put them into plugins/Nexo/pack/template_packs
 * (the export does not ship them): an empty pack each, so Nexo finds them.
 */
function addTemplatePacks(setup: ServerSetup, project: Project): void {
  const templates = project.settings.multipack?.templates;
  if (!templates || typeof templates !== 'object' || Array.isArray(templates)) return;
  for (const id of Object.keys(templates)) {
    const dir = path.join(setup.dir, 'plugins', 'Nexo', 'pack', 'template_packs', id);
    fs.mkdirSync(dir, { recursive: true });
    const mcmeta = { pack: { pack_format: getMcVersion(project.settings.minecraftVersion).packFormat, description: id } };
    fs.writeFileSync(path.join(dir, 'pack.mcmeta'), JSON.stringify(mcmeta));
  }
}

const SAMPLES: Record<PackTargetId, (minecraftVersion: string) => Project> = { nexo: nexoSample, craftengine: craftEngineSample };

/** Runs the check for one target; resolves with the number of findings. */
async function verifyTarget(target: PackTargetId, options: Options): Promise<number> {
  const adapter = serverAdapterFor(target);
  // Every file of a run is named after the target and the version, so runs for several versions can share `out`
  const name = `${target}-${options.paper}`;
  const exported = exportProject(SAMPLES[target](options.paper), path.join(options.out, `${name}-export`));
  const exportErrors = exported.issues.filter((issue) => issue.startsWith('error ')).length;
  console.log(`${adapter.pluginName}: exported ${exported.files.length} files`);
  if (exported.issues.length > 0) console.log(`Export issues:\n  ${exported.issues.join('\n  ')}`);
  if (options.exportOnly) return exportErrors;

  const jarDir = path.join(options.out, 'jars');
  const paper = await ensurePaperJar(options.paper, jarDir);
  let pluginJar: string;
  if (target === 'nexo') {
    if (!options.nexoJar) throw new Error('Nexo needs --nexo-jar <file> (Nexo is a paid plugin)');
    // A copy: the user's JAR is never touched
    pluginJar = path.join(jarDir, path.basename(options.nexoJar));
    if (path.resolve(options.nexoJar) !== path.resolve(pluginJar)) fs.copyFileSync(options.nexoJar, pluginJar);
  } else {
    const craftEngine = await ensureCraftEngineJar(options.paper, jarDir);
    pluginJar = craftEngine.jar;
    console.log(`CraftEngine ${craftEngine.version}`);
  }
  console.log(`${adapter.pluginName}: Paper ${options.paper} build ${paper.build}, plugin ${path.basename(pluginJar)}`);

  const dir = path.join(options.out, `${name}-server`);
  if (options.fresh) fs.rmSync(dir, { recursive: true, force: true });
  const setup: ServerSetup = { dir, target, paperJar: paper.jar, pluginJar, port: await freePort(), packPort: await freePort() };
  const firstStart = !fs.existsSync(path.join(dir, 'server.properties'));
  prepareServerDir(setup);

  if (firstStart) {
    // The first start writes Paper's and the plugin's default files, which the install then patches
    console.log('First start (default files) …');
    const server = RunningServer.start(dir, paper.jar, target, path.join(options.out, `${name}-first.log`));
    try {
      await server.waitFor((_line, event) => event?.type === 'started', STARTUP_TIMEOUT_MS, 'the first start');
    } finally {
      await server.stop();
    }
  }

  const install = installProject(setup, exported, {
    attributes: target === 'craftengine' && craftEngineUsesAttributes(exported.project),
    scripting: target === 'craftengine' && craftEngineUsesScripts(exported.project),
    // Nexo prints some config problems only in debug mode
    extraSettings: target === 'nexo' ? [[['debug'], true]] : [],
  });
  if (target === 'nexo') addTemplatePacks(setup, exported.project);
  console.log(
    `Installed ${install.written.length} files${install.refused.length ? `, refused ${install.refused.length}: ${install.refused.join(', ')}` : ''}`,
  );

  console.log('Start with the project …');
  const server = RunningServer.start(dir, paper.jar, target, path.join(options.out, `${name}-run.log`));
  try {
    await server.waitFor((_line, event) => event?.type === 'started', STARTUP_TIMEOUT_MS, 'the start');
    const packDone = (_line: string, event: { type: string } | null) => event?.type === 'packReady' || event?.type === 'packFailed';
    console.log(`Running; "${adapter.reloadCommand}" …`);
    const built = server.waitFor(packDone, PACK_TIMEOUT_MS, 'the pack build');
    server.command(adapter.reloadCommand);
    console.log(`Pack: ${await built}`);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  } finally {
    const code = await server.stop();
    console.log(`Stopped (exit code ${code})`);
  }

  // A known problem of older versions counts again on a version that should not have it
  const rules = RULES[target];
  const known = rules.known.filter((rule) => !rule.below || compareVersions(options.paper, rule.below) < 0);
  const findings = scanLog(server.lines, { ...rules, known });
  const counted = findings.filter((finding) => !finding.known);
  const report = formatFindings(findings);
  fs.writeFileSync(path.join(options.out, `${name}-findings.txt`), report + '\n');
  console.log(
    `${counted.length} finding(s) and ${findings.length - counted.length} known for ${adapter.pluginName}${report ? `:\n${report}` : ''}`,
  );
  return counted.length + install.refused.length + exportErrors;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  fs.mkdirSync(options.out, { recursive: true });
  let total = 0;
  for (const target of options.targets) total += await verifyTarget(target, options);
  process.exitCode = total > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 2;
});
