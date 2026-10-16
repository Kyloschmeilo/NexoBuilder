/** Glyphs, sounds and paintings: their pack files, plugin files and checks. */
import { mediaFrame, mediaKey, type MediaKind, type Project } from '@resourcepackbuilder/core/project';
import { inContext, type Issue } from '@resourcepackbuilder/utils';
import {
  buildGlyphFile,
  glyphFilePath,
  paintingMcmeta,
  paintingToYaml,
  soundFilePath,
  soundToYaml,
  validateGlyphs,
  validatePaintings,
  validateSounds,
} from '@resourcepackbuilder/core/nexo';
import type { PackWriter } from '../../packWriter';
import { glyphTextureFile, paintingTextureFile, soundFile } from '../../paths';
import type { NexoRootEntries } from '../../types';

/** The glyph file (relative to plugins/Nexo) and the root file entries. */
interface MediaFiles extends NexoRootEntries {
  glyphFiles: Map<string, string>;
}

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
