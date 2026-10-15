import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parse } from 'yaml';
import { createProject } from '../project/factory';
import { INSTALL_GUIDE_FILE } from './installGuide';
import { planExport } from './plan';
import { planMultiExport } from './selection';
import { buildExportZip, buildMultiExportZip } from './zip';
import { nexoFolderFiles } from '../testserver/files';
import { makePngDataUrl } from '../test/png';
import type { Issue } from '../issues';
import type { Project } from '../project/types';
import { createPainting } from '../nexo/paintings/model';
import { createSound } from '../nexo/sounds/model';

/** The context codes of an issue (outermost first), then its own code. */
const issueCodes = (issue: Issue): string[] => [...(issue.context ?? []).map((c) => c.code), issue.code];

const OGG = 'data:audio/ogg;base64,' + btoa('OggS' + '\0'.repeat(20));

function mediaProject(name = 'Klang', ns = 'klang'): Project {
  const project = createProject(name, ns, '1.21.11');
  const ding = createSound('s1', 'block.glocke.ding', [{ name: 'ding.ogg', dataUrl: OGG, size: 24 }]);
  ding.volume = 0.8;
  const song = createSound('s2', 'music.lied', [
    { name: 'a.ogg', dataUrl: OGG, size: 24 },
    { name: 'b.ogg', dataUrl: OGG, size: 24 },
  ]);
  song.stream = true;
  song.jukebox = { duration: '2m 30s', description: '<gold>Mein Lied', comparatorOutput: 7, range: null };
  project.sounds = [ding, song];
  const picture = createPainting('p1', 'sonne', { name: 'sonne.png', dataUrl: makePngDataUrl(32, 16), width: 32, height: 16 });
  picture.title = 'Sonne';
  const anim = createPainting('p2', 'welle', { name: 'welle.png', dataUrl: makePngDataUrl(16, 64), width: 16, height: 64 });
  anim.width = 1;
  anim.height = 1;
  anim.animated = true;
  anim.frametime = 4;
  project.paintings = [picture, anim];
  return project;
}

describe('sounds and paintings', () => {
  it('writes OGG files, painting textures and the entries for sounds.yml/paintings.yml', async () => {
    const project = mediaProject();
    const plan = planExport(project);
    expect(plan.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(plan.packFiles.has('assets/klang/sounds/block/glocke/ding.ogg')).toBe(true);
    expect(plan.packFiles.has('assets/klang/sounds/music/lied_2.ogg')).toBe(true);
    expect(plan.packFiles.has('assets/klang/textures/painting/sonne.png')).toBe(true);
    expect(JSON.parse(plan.packFiles.get('assets/klang/textures/painting/welle.png.mcmeta') as string)).toEqual({
      animation: { width: 16, height: 16, frametime: 4 },
    });

    const result = await buildExportZip(project, plan, 'full');
    expect(result.paths).toContain('sounds.yml');
    expect(result.paths).toContain('paintings.yml');
    const zip = await JSZip.loadAsync(result.data);
    const sounds = parse(await zip.file('sounds.yml')!.async('string'));
    expect(sounds).toEqual({
      sounds: [
        { id: 'klang:block.glocke.ding', sound: 'klang:block/glocke/ding', volume: 0.8 },
        {
          id: 'klang:music.lied',
          sounds: ['klang:music/lied_1', 'klang:music/lied_2'],
          stream: true,
          jukebox_playable: { duration: '2m 30s', description: '<gold>Mein Lied', comparator_output: 7 },
        },
      ],
    });
    const paintings = parse(await zip.file('paintings.yml')!.async('string'));
    expect(paintings.paintings['klang:sonne']).toEqual({ title: 'Sonne', asset_id: 'klang:sonne', width: 2, height: 1 });
    const guide = await zip.file(INSTALL_GUIDE_FILE)!.async('string');
    expect(guide).toContain('sounds.yml');
  });

  it('reports invalid sounds and paintings', () => {
    const project = mediaProject();
    project.sounds[0].files[0].dataUrl = makePngDataUrl(1, 1);
    project.sounds[1].jukebox!.duration = '';
    project.paintings[0].width = 20;
    project.settings.minecraftVersion = '1.21.4';
    const codes = planExport(project).issues.map((i) => `${i.level}: ${issueCodes(i).join(' > ')}`);
    expect(codes).toContain('error: context.sound > sound.notOgg');
    expect(codes).toContain('error: context.sound > sound.jukeboxDurationMissing');
    expect(codes).toContain('error: context.painting > painting.widthRange');
    expect(codes).toContain('warning: painting.datapackNeedsVersion');
  });

  it('merges sounds.yml of several projects and reports duplicate IDs', async () => {
    const a = mediaProject('Klang', 'klang');
    const b = mediaProject('Andere', 'andere');
    const multi = planMultiExport([{ project: a }, { project: b }], { includeBinaries: true });
    expect(multi.issues.filter((i) => i.level === 'error' && !i.projectId)).toEqual([]);
    const zip = await JSZip.loadAsync((await buildMultiExportZip(multi, 'full')).data);
    const sounds = parse(await zip.file('sounds.yml')!.async('string')).sounds as Array<{ id: string }>;
    expect(sounds.map((s) => s.id)).toEqual(['klang:block.glocke.ding', 'klang:music.lied', 'andere:block.glocke.ding', 'andere:music.lied']);

    const same = planMultiExport([{ project: a }, { project: mediaProject('Kopie', 'klang') }]);
    expect(same.issues.some((i) => issueCodes(i).includes('selection.soundIdClash') && JSON.stringify(i).includes('klang:music.lied'))).toBe(true);
    expect(same.issues.some((i) => issueCodes(i).includes('selection.paintingIdClash') && JSON.stringify(i).includes('klang:sonne'))).toBe(true);
  });

  it('also transfers sounds.yml and paintings.yml to the test server', () => {
    const project = mediaProject();
    const paths = nexoFolderFiles(project, planExport(project)).map((f) => f.path);
    expect(paths).toContain('sounds.yml');
    expect(paths).toContain('paintings.yml');
    expect(paths).toContain('pack/external_packs/klang/assets/klang/sounds/block/glocke/ding.ogg');
  });

  it('leaves deselected sounds and paintings out of the export', () => {
    const project = mediaProject();
    const multi = planMultiExport([{ project, selection: { excludedItemIds: [], excludedGlyphIds: [], excludedSoundIds: ['s2'], excludedPaintingIds: ['p1', 'p2'] } }]);
    expect(multi.projects[0].plan.soundEntries.map((s) => s.id)).toEqual(['klang:block.glocke.ding']);
    expect(multi.projects[0].plan.paintingEntries).toEqual({});
  });
});
