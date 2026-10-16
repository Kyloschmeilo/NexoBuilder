import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { planExport } from '../export/plan';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import { createTextureModel } from '../model/textureModel';
import { makePngDataUrl } from '../test/png';
import { consoleCommandText, isNexoReloadCommand, NEXO_RELOAD_COMMAND, opCommand } from './commands';
import { cleanPlayerName, DEFAULT_TEST_SERVER_CONFIG, NEXO_JAR_FILE_PATTERN, nexoJarFileName } from './config';
import { nexoFolderFiles, nexoGiveCommand, nexoPackCommand } from './files';
import { guessJavaFor, parseJavaVersion } from './java';
import { parsePluginDescriptor, readPluginDescriptor } from './pluginJar';
import { DEFAULT_SERVER_PROPERTIES, parseProperties, patchPaperGlobal, setProperty } from './serverFiles';
import { parseServerLogLine, stripAnsi } from './serverLog';
import { syncPathSegments } from './syncPaths';

describe('Test server: console lines', () => {
  it.each([
    ['[14:02:11 INFO]: Done (6.512s)! For help, type "help"', { type: 'started' }],
    ['[14:02:11 INFO]: Done (12,3s)! For help, type "help"', { type: 'started' }],
    ['[14:02:01 WARN]: **** FAILED TO BIND TO PORT!', { type: 'portInUse' }],
    ['[14:02:12 INFO]: [Nexo] Generating resourcepack...', { type: 'packBuilding' }],
    [
      '[14:02:20 INFO]: [Nexo] Resourcepack uploaded and will be dispatched with publicAddress http://127.0.0.1:8082/pack.zip',
      { type: 'packReady', url: 'http://127.0.0.1:8082/pack.zip' },
    ],
    [
      '[14:02:20 INFO]: [Nexo] ResourcePack uploaded: http://127.0.0.1:8082/x.zip',
      { type: 'packReady', url: 'http://127.0.0.1:8082/x.zip' },
    ],
    [
      '[14:02:20 ERROR]: [Nexo] Failed to build and send the finished ResourcePack: items.json already exists',
      { type: 'packFailed', message: 'items.json already exists' },
    ],
    ['[14:02:20 ERROR]: [Nexo] Upload failed: timeout', { type: 'packFailed', message: 'timeout' }],
    ['[14:02:20 ERROR]: [Nexo] Resourcepack could not be uploaded', { type: 'packFailed', message: null }],
  ])('reads %s', (line, event) => {
    expect(parseServerLogLine(line)).toEqual(event);
  });

  it('ignores ordinary lines and pack messages of other plugins', () => {
    expect(parseServerLogLine('[14:02:11 INFO]: Preparing spawn area: 84%')).toBeNull();
    expect(parseServerLogLine('[14:02:12 INFO]: [OtherPlugin] Generating resourcepack...')).toBeNull();
  });

  it('removes colour codes', () => {
    expect(stripAnsi('\x1b[33;1mWarning\x1b[0m text')).toBe('Warning text');
  });
});

describe('Test server: commands', () => {
  it('builds commands for valid arguments', () => {
    expect(opCommand('Steve_42')).toBe('op Steve_42');
    expect(nexoGiveCommand('ruby_sword', 2.7, 'Steve')).toBe('nexo give ruby_sword 2 Steve');
    expect(nexoPackCommand('Steve')).toBe('nexo pack Steve');
  });

  it.each(['@a', '', 'Steve op Alex', 'Steve\nstop', 'x'.repeat(17)])('refuses the player name %j', (player) => {
    expect(() => opCommand(player)).toThrow(RangeError);
    expect(() => nexoPackCommand(player)).toThrow(RangeError);
    expect(() => nexoGiveCommand('ruby', 1, player)).toThrow(RangeError);
  });

  it('refuses item ids with spaces or line breaks', () => {
    expect(() => nexoGiveCommand('ruby 64 @a', 1, 'Steve')).toThrow(RangeError);
    expect(() => nexoGiveCommand('ruby\nstop', 1, 'Steve')).toThrow(RangeError);
  });

  it('recognises a typed Nexo reload', () => {
    expect(consoleCommandText(' /give a\r\nb ')).toBe('give a b');
    expect(consoleCommandText(' / ')).toBe('');
    expect(isNexoReloadCommand(NEXO_RELOAD_COMMAND)).toBe(true);
    expect(isNexoReloadCommand(' /n rl items')).toBe(true);
    expect(isNexoReloadCommand('nexo give ruby 1 Steve')).toBe(false);
    expect(isNexoReloadCommand('nexorl')).toBe(false);
  });
});

describe('Test server: settings', () => {
  it('cleans typed player names', () => {
    expect(cleanPlayerName('St eve-@123456789012345')).toBe('Steve12345678901');
    expect(cleanPlayerName(undefined)).toBe('');
  });

  it('names the Nexo JAR safely', () => {
    expect(nexoJarFileName('1.12.0')).toBe('Nexo-1.12.0.jar');
    expect(nexoJarFileName('../../evil')).toBe('Nexo-.._.._evil.jar');
    expect(nexoJarFileName('')).toBe('Nexo-unknown.jar');
    for (const version of ['1.0', '../x', 'a b/c\\d', '']) expect(nexoJarFileName(version)).toMatch(NEXO_JAR_FILE_PATTERN);
    expect('../../x').not.toMatch(NEXO_JAR_FILE_PATTERN);
  });

  it('has defaults within the limits', () => {
    expect(DEFAULT_TEST_SERVER_CONFIG.port).toBe(25565);
    expect(Object.isFrozen(DEFAULT_TEST_SERVER_CONFIG)).toBe(true);
  });
});

describe('Test server: Java', () => {
  it.each([
    ['1.16.5', 17],
    ['1.20.4', 17],
    ['1.20.5', 21],
    ['1.21.11', 21],
    ['26.1', 25],
  ])('needs at least Java for Minecraft %s', (version, java) => {
    expect(guessJavaFor(version)).toBe(java);
  });

  it('reads the version of a Java installation', () => {
    expect(parseJavaVersion('openjdk version "21.0.2" 2024-01-16 LTS')).toBe(21);
    expect(parseJavaVersion('java version "1.8.0_402"')).toBe(8);
    expect(parseJavaVersion('not java')).toBeNull();
  });
});

describe('Test server: paths the project may write', () => {
  it('allows every file of the export', () => {
    const project = createProject('Test Pack', 'testpack');
    const model = createTextureModel('handheld', { layer0: 'ruby.png' }, [{ name: 'ruby.png', dataUrl: makePngDataUrl(16, 16) }]);
    const folder = createFolder('Weapons', null);
    insertFolder(project, folder);
    insertItem(project, createItem({ displayName: 'Rubin', nexoId: 'ruby', folderId: folder.id, model }));
    const files = nexoFolderFiles(project, planExport(project, { includeBinaries: true }));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(syncPathSegments(file.path), file.path).not.toBeNull();
  });

  it.each([
    'settings.yml',
    'items/../settings.yml',
    'items/./a.yml',
    'items/',
    '../x',
    'pack/other/x',
    'items//a.yml',
    'items/a b.yml',
    'sounds.yml/x',
  ])('refuses %s', (path) => {
    expect(syncPathSegments(path)).toBeNull();
  });

  it('splits allowed paths into segments', () => {
    expect(syncPathSegments('pack/external_packs/p/pack.mcmeta')).toEqual(['pack', 'external_packs', 'p', 'pack.mcmeta']);
    expect(syncPathSegments('sounds.yml')).toEqual(['sounds.yml']);
  });
});

describe('Test server: server.properties', () => {
  it('replaces a value in place and keeps comments and order', () => {
    const text = '# comment\nmotd=Hi\nserver-port=25565\nlevel-type=minecraft\\:flat\n';
    expect(setProperty(text, 'server-port', '25570')).toBe('# comment\nmotd=Hi\nserver-port=25570\nlevel-type=minecraft\\:flat\n');
  });

  it('appends a missing key', () => {
    expect(setProperty('motd=Hi\n\n', 'server-port', '25566')).toBe('motd=Hi\nserver-port=25566\n');
  });

  it('keeps Windows line endings', () => {
    expect(setProperty('motd=Hi\r\nserver-port=1\r\n', 'server-port', '2')).toBe('motd=Hi\r\nserver-port=2\r\n');
  });

  it('parses keys, escaped values and separators', () => {
    const properties = parseProperties(DEFAULT_SERVER_PROPERTIES + 'spaced = yes\ncolon: also\n! bang comment\n');
    expect(properties.get('server-port')).toBe('25565');
    expect(properties.get('level-type')).toBe('minecraft:flat');
    expect(properties.get('spaced')).toBe('yes');
    expect(properties.get('colon')).toBe('also');
    expect(properties.has('# Created by the ResourcepackBuilder test server – feel free to adjust')).toBe(false);
  });
});

describe('Test server: paper-global.yml', () => {
  const paperGlobal = [
    '# This is the global configuration file for Paper.',
    '_version: 29',
    'block-updates:',
    '  disable-chorus-plant-updates: false',
    '  disable-mushroom-block-updates: false',
    '  disable-noteblock-updates: false # keep',
    '  disable-tripwire-updates: false',
    'chunk-loading-basic:',
    '  autoconfig-send-distance: true',
    '',
  ].join('\n');

  it('turns off the block updates Nexo needs and keeps everything else', () => {
    const patched = patchPaperGlobal(paperGlobal);
    expect(patched).not.toBeNull();
    expect(parse(patched!)).toEqual({
      _version: 29,
      'block-updates': {
        'disable-chorus-plant-updates': true,
        'disable-mushroom-block-updates': false,
        'disable-noteblock-updates': true,
        'disable-tripwire-updates': true,
      },
      'chunk-loading-basic': { 'autoconfig-send-distance': true },
    });
    expect(patched).toContain('# This is the global configuration file for Paper.');
    expect(patched).toContain('# keep');
  });

  it('reports no change when the settings are already right', () => {
    expect(patchPaperGlobal(patchPaperGlobal(paperGlobal)!)).toBeNull();
    expect(patchPaperGlobal('not: [valid')).toBeNull();
  });
});

describe('Test server: plugin JAR', () => {
  async function jar(files: Record<string, string>): Promise<Uint8Array> {
    const zip = new JSZip();
    for (const [name, text] of Object.entries(files)) zip.file(name, text);
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  it('reads name and version from plugin.yml, keeping versions as text', async () => {
    expect(await readPluginDescriptor(await jar({ 'plugin.yml': 'name: Nexo\nversion: 1.10\nmain: com.nexomc.Nexo\n' }))).toEqual({
      name: 'Nexo',
      version: '1.10',
    });
  });

  it('prefers paper-plugin.yml', async () => {
    const bytes = await jar({ 'plugin.yml': 'name: Old\n', 'paper-plugin.yml': 'name: \'Nexo\'\nversion: "2.0"\n' });
    expect(await readPluginDescriptor(bytes)).toEqual({ name: 'Nexo', version: '2.0' });
  });

  it('returns null for anything that is no plugin', async () => {
    expect(await readPluginDescriptor(new TextEncoder().encode('no zip'))).toBeNull();
    expect(await readPluginDescriptor(await jar({ 'README.txt': 'hi' }))).toBeNull();
    expect(parsePluginDescriptor('version: 1\n')).toBeNull();
    expect(parsePluginDescriptor('[broken')).toBeNull();
  });
});
