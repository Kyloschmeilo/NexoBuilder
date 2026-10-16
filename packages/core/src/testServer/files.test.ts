import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import { planExport } from '../export/plan';
import { nexoFolderFiles, nexoGiveCommand, nexoPackCommand, patchNexoSettings } from './files';
import { createTextureModel } from '../model/textureModel';
import { makePngDataUrl } from '../../test-utils/png';

describe('Test server: files for plugins/Nexo', () => {
  it('places items, recipes and the pack as a folder under pack/external_packs', () => {
    const project = createProject('Test Pack', 'testpack');
    project.settings.externalPackAsZip = true; // ignored for the test server
    const folder = createFolder('Waffen', null);
    insertFolder(project, folder);
    const model = createTextureModel('handheld', { layer0: 'ruby.png' }, [{ name: 'ruby.png', dataUrl: makePngDataUrl(16, 16) }]);
    insertItem(project, createItem({ displayName: 'Rubin', nexoId: 'ruby', folderId: folder.id, model }));
    const plan = planExport(project, { includeBinaries: true });
    const files = nexoFolderFiles(project, plan);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('items/waffen/waffen.yml');
    expect(paths).toContain('pack/external_packs/test_pack/pack.mcmeta');
    expect(paths.some((p) => /^pack\/external_packs\/test_pack\/assets\/testpack\/models\/item\/waffen\/ruby\.json$/.test(p))).toBe(true);
    expect(paths.some((p) => p.endsWith('.png'))).toBe(true);
    expect(paths.every((p) => !p.endsWith('.zip'))).toBe(true);
  });

  it('uses a safe folder name if the pack name is invalid', () => {
    const project = createProject('X');
    project.settings.packName = 'mein pack!';
    const files = nexoFolderFiles(project, planExport(project, { includeBinaries: true }));
    expect(files.some((f) => f.path.startsWith('pack/external_packs/resourcepackbuilder/'))).toBe(true);
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
    expect(nexoGiveCommand('purpel_block', 1, 'Kyloschmeilo')).toBe('nexo give purpel_block 1 Kyloschmeilo');
    expect(nexoGiveCommand('ruby', 0, 'Steve')).toBe('nexo give ruby 1 Steve');
  });

  it('resends the pack to a player', () => {
    expect(nexoPackCommand('Steve')).toBe('nexo pack Steve');
  });
});
