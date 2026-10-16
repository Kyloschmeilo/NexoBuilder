/** Glyphs, sounds and paintings: their pack files, plugin files and checks. */
import { mediaFrame } from '@resourcepackbuilder/core/project/issueFrames';
import { inContext, type Issue } from '@resourcepackbuilder/utils';
import { buildGlyphFile, glyphFilePath } from '@resourcepackbuilder/core/nexo/glyphs/files';
import { validateGlyphs } from '@resourcepackbuilder/core/nexo/glyphs/validate';
import type { MediaKind } from '@resourcepackbuilder/core/project/media/kinds';
import { paintingMcmeta, paintingToYaml } from '@resourcepackbuilder/core/nexo/paintings/files';
import { mediaKey } from '@resourcepackbuilder/core/project/media/entry';
import { validatePaintings } from '@resourcepackbuilder/core/nexo/paintings/validate';
import { soundFilePath, soundToYaml } from '@resourcepackbuilder/core/nexo/sounds/files';
import { validateSounds } from '@resourcepackbuilder/core/nexo/sounds/validate';
import type { Project } from '@resourcepackbuilder/core/project/types';
import type { PackWriter } from './packWriter';
import { glyphTextureFile, paintingTextureFile, soundFile } from './paths';
import type { ExportPlan } from './types';

type MediaFiles = Pick<ExportPlan, 'glyphFiles' | 'soundEntries' | 'paintingEntries'>;

export function writeMedia(writer: PackWriter, project: Project, issues: Issue[]): MediaFiles {
  // Unreadable files are reported like the entry's own checks: targeted and with its context frame
  const reportFor = (kind: MediaKind, id: string, name: string) => (issue: Issue) =>
    issues.push(inContext(issue, [mediaFrame(kind, name)], { kind, id }));
  issues.push(...validateGlyphs(project), ...validateSounds(project), ...validatePaintings(project));

  const ns = project.namespace;
  for (const glyph of project.glyphs) {
    if (!glyph.file || glyph.kind === 'reference') continue;
    const path = glyphTextureFile(ns, glyph.glyphId, glyph.kind === 'gif' ? 'gif' : 'png');
    writer.binary(path, glyph.file.dataUrl, { report: reportFor('glyph', glyph.id, glyph.glyphId) });
  }
  for (const sound of project.sounds) {
    const report = reportFor('sound', sound.id, sound.soundId);
    sound.files.forEach((file, i) => writer.binary(soundFile(ns, soundFilePath(sound, i)), file.dataUrl, { report }));
  }
  for (const painting of project.paintings) {
    if (!painting.file) continue;
    const path = paintingTextureFile(ns, painting.paintingId);
    const mcmeta = paintingMcmeta(painting);
    if (writer.binary(path, painting.file.dataUrl, { report: reportFor('painting', painting.id, painting.paintingId) }) && mcmeta) {
      writer.json(`${path}.mcmeta`, mcmeta);
    }
  }

  const glyphYaml = buildGlyphFile(project);
  return {
    glyphFiles: new Map(glyphYaml ? [[glyphFilePath(project), glyphYaml]] : []),
    soundEntries: project.sounds.map((sound) => soundToYaml(project, sound)),
    paintingEntries: Object.fromEntries(project.paintings.map((p) => [mediaKey(project, p.paintingId), paintingToYaml(project, p)])),
  };
}
