import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  createFolder,
  createItem,
  createPainting,
  createProject,
  createSound,
  insertFolder,
  insertItem,
} from '@resourcepackbuilder/core/project';
import { exportPackName, planExport } from '@resourcepackbuilder/export';
import { CRAFT_ENGINE_SERVER_ADAPTER } from './craftEngine/adapter';
import { pluginFolderFiles } from './files';
import { NEXO_SERVER_ADAPTER } from './nexo/adapter';
import { createTextureModel } from '@resourcepackbuilder/minecraft';
import { makePngDataUrl } from '@resourcepackbuilder/test-utils/png';

const nexo = NEXO_SERVER_ADAPTER;
const patchNexoSettings = nexo.patchConfig;

describe('Test server: files for plugins/Nexo', () => {
  it('places items, recipes and the pack as a folder under pack/external_packs', () => {
    const project = createProject('Test Pack', 'testpack');
    project.settings.externalPackAsZip = true; // ignored for the test server
    const folder = createFolder('Waffen', null);
    insertFolder(project, folder);
    const model = createTextureModel('handheld', { layer0: 'ruby.png' }, [{ name: 'ruby.png', dataUrl: makePngDataUrl(16, 16) }]);
    insertItem(project, createItem({ displayName: 'Rubin', itemId: 'ruby', folderId: folder.id, model }));
    const plan = planExport(project, { includeBinaries: true });
    const files = pluginFolderFiles(project, plan);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('items/waffen/waffen.yml');
    expect(paths).toContain('pack/external_packs/test_pack/pack.mcmeta');
    expect(paths.some((p) => /^pack\/external_packs\/test_pack\/assets\/testpack\/models\/item\/waffen\/ruby\.json$/.test(p))).toBe(true);
    expect(paths.some((p) => p.endsWith('.png'))).toBe(true);
    expect(paths.every((p) => !p.endsWith('.zip'))).toBe(true);
  });

  it('also transfers sounds.yml and paintings.yml', () => {
    const project = createProject('Klang', 'klang', '1.21.11');
    const ogg = 'data:audio/ogg;base64,' + btoa('OggS' + '\0'.repeat(20));
    project.sounds = [createSound('s1', 'block.glocke.ding', [{ name: 'ding.ogg', dataUrl: ogg, size: 24 }])];
    project.paintings = [createPainting('p1', 'sonne', { name: 'sonne.png', dataUrl: makePngDataUrl(32, 16), width: 32, height: 16 })];
    const paths = pluginFolderFiles(project, planExport(project)).map((f) => f.path);
    expect(paths).toContain('sounds.yml');
    expect(paths).toContain('paintings.yml');
    expect(paths).toContain('pack/external_packs/klang/assets/klang/sounds/block/glocke/ding.ogg');
  });

  it('uses a safe folder name if the pack name is invalid', () => {
    const project = createProject('X');
    project.settings.packName = 'mein pack!';
    const files = pluginFolderFiles(project, planExport(project, { includeBinaries: true }));
    expect(files.some((f) => f.path.startsWith('pack/external_packs/resourcepackbuilder/'))).toBe(true);
  });
});

describe('Test server: files for plugins/CraftEngine', () => {
  it('writes only paths the CraftEngine adapter accepts', () => {
    const project = createProject('Kristall', 'kristall', '1.21.11', 'craftengine');
    const folder = createFolder('Waffen', null);
    insertFolder(project, folder);
    const model = createTextureModel('handheld', { layer0: 'gem.png' }, [{ name: 'gem.png', dataUrl: makePngDataUrl(16, 16) }]);
    insertItem(project, createItem({ displayName: 'Edelstein', itemId: 'gem', folderId: folder.id, model }));
    const paths = pluginFolderFiles(project, planExport(project)).map((f) => f.path);
    expect(paths).toContain('resources/kristall/pack.yml');
    expect(paths).toContain('resources/kristall/configuration/items/waffen/waffen.yml');
    expect(paths).toContain('resources/kristall/resourcepack/pack.mcmeta');
    const packName = exportPackName(project);
    expect(paths.filter((path) => CRAFT_ENGINE_SERVER_ADAPTER.syncPathSegments(path, { packName }) === null)).toEqual([]);
  });
});

describe('Test server: Nexo settings', () => {
  it('creates a new settings.yml with a local pack server', () => {
    const text = patchNexoSettings(null, { packPort: 8082 });
    expect(parse(text)).toEqual({
      Pack: {
        server: { type: 'SELFHOST', selfhost: { port: 8082, public_address: '127.0.0.1' } },
        dispatch: { send_on_reload: true },
        obfuscation: { type: 'NONE' },
      },
    });
  });

  it('changes only the required values and keeps comments and other settings', () => {
    const existing = [
      '# Nexo Einstellungen',
      'Plugin:',
      '  language: german # Sprache',
      'Pack:',
      '  server:',
      '    type: HERMES',
      '    selfhost:',
      '      port: 8082',
      '      public_address: ""',
      '  dispatch:',
      '    send_on_reload: false',
      '    mandatory: true',
      '',
    ].join('\n');
    const text = patchNexoSettings(existing, { packPort: 8090 });
    expect(text).toContain('# Nexo Einstellungen');
    expect(text).toContain('language: german # Sprache');
    const data = parse(text);
    expect(data.Pack.server.type).toBe('SELFHOST');
    expect(data.Pack.server.selfhost).toEqual({ port: 8090, public_address: '127.0.0.1' });
    expect(data.Pack.dispatch).toEqual({ send_on_reload: true, mandatory: true });
    // A second pass changes nothing
    expect(patchNexoSettings(text, { packPort: 8090 })).toBe(text);
  });

  it('leaves a file reformatted by Nexo unchanged if all values are already correct', () => {
    // This is how Nexo writes the file after startup (different indentation, quotes, comments)
    const nexoFormatted = [
      'Plugin:',
      '    language: english',
      'Pack:',
      '    generation:',
      '        generate_pack: true',
      '    obfuscation:',
      "        type: 'none'",
      '        cache: true',
      '    server:',
      "        type: 'SELFHOST'",
      '        selfhost:',
      "            port: '8082'",
      "            public_address: '127.0.0.1'",
      '    dispatch:',
      '        send_pre_join: true',
      '        send_on_reload: true',
      '',
    ].join('\n');
    expect(patchNexoSettings(nexoFormatted, { packPort: 8082 })).toBe(nexoFormatted);
  });

  it('replaces a broken file with the required values', () => {
    const text = patchNexoSettings('Pack: [kaputt', { packPort: 8082 });
    expect(parse(text).Pack.server.type).toBe('SELFHOST');
  });
});

describe('Test server: commands', () => {
  it('gives items in the Nexo 1.29 order: give <item> <amount> <player>', () => {
    expect(nexo.giveCommand('purpel_block', 1, 'Kyloschmeilo')).toBe('nexo give purpel_block 1 Kyloschmeilo');
    expect(nexo.giveCommand('ruby', 0, 'Steve')).toBe('nexo give ruby 1 Steve');
  });

  it('resends the pack to a player', () => {
    expect(nexo.resendPackCommand('Steve')).toBe('nexo pack Steve');
  });
});
