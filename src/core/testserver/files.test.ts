import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '../project/factory';
import { planExport } from '../export/plan';
import { nexoFolderFiles, patchNexoSettings } from './files';
import { createTextureModel } from '../model/textureModel';
import { makePngDataUrl } from '../../test/png';

describe('Testserver: Dateien für plugins/Nexo', () => {
  it('legt Items, Rezepte und das Pack als Ordner unter pack/external_packs ab', () => {
    const project = createProject('Test Pack', 'testpack');
    project.settings.externalPackAsZip = true; // wird für den Testserver ignoriert
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

  it('nutzt einen sicheren Ordnernamen, wenn der Pack-Name ungültig ist', () => {
    const project = createProject('X');
    project.settings.packName = 'mein pack!';
    const files = nexoFolderFiles(project, planExport(project, { includeBinaries: true }));
    expect(files.some((f) => f.path.startsWith('pack/external_packs/nexobuilder/'))).toBe(true);
  });
});

describe('Testserver: Nexo-Einstellungen', () => {
  it('legt eine neue settings.yml mit lokalem Pack-Server an', () => {
    const text = patchNexoSettings(null, { packPort: 8082 });
    expect(parse(text)).toEqual({
      Pack: {
        server: { type: 'SELFHOST', selfhost: { port: 8082, public_address: '127.0.0.1' } },
        dispatch: { send_on_reload: true },
        obfuscation: { type: 'NONE' },
      },
    });
  });

  it('ändert nur die nötigen Werte und behält Kommentare und andere Einstellungen', () => {
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
    // Zweiter Durchlauf ändert nichts mehr
    expect(patchNexoSettings(text, { packPort: 8090 })).toBe(text);
  });

  it('lässt eine von Nexo umformatierte Datei unverändert, wenn alle Werte schon stimmen', () => {
    // So schreibt Nexo die Datei nach dem Start (andere Einrückung, Anführungszeichen, Kommentare)
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

  it('ersetzt eine kaputte Datei durch die nötigen Werte', () => {
    const text = patchNexoSettings('Pack: [kaputt', { packPort: 8082 });
    expect(parse(text).Pack.server.type).toBe('SELFHOST');
  });
});
