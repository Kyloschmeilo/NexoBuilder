/** The pack side of glyphs, sounds and paintings, shared by every target: their checks, textures and OGG files. */
import {
  mediaFrame,
  type MediaKind,
  paintingMcmeta,
  type Project,
  soundFilePath,
  validateGlyphs,
  validatePaintings,
  validateSounds,
} from '@resourcepackbuilder/core/project';
import { inContext, type Issue } from '@resourcepackbuilder/utils';
import type { PackWriter } from './packWriter';
import { glyphTextureFile, paintingTextureFile, soundFile } from './paths';

export interface MediaPackOptions {
  /** Whether the target shows animated (GIF) glyphs; without it their GIFs are left out of the pack */
  gifGlyphs: boolean;
}

/** Checks the project's media and writes their files into the pack. */
export function writeMediaPackFiles(writer: PackWriter, project: Project, issues: Issue[], options: MediaPackOptions): void {
  // Unreadable files are reported like the entry's own checks: targeted and with its context frame
  const reportFor = (kind: MediaKind, id: string, name: string) => (issue: Issue) =>
    issues.push(inContext(issue, [mediaFrame(kind, name)], { kind, id }));
  issues.push(...validateGlyphs(project), ...validateSounds(project), ...validatePaintings(project));

  const ns = project.namespace;
  for (const glyph of project.glyphs) {
    if (!glyph.file || glyph.kind === 'reference' || (glyph.kind === 'gif' && !options.gifGlyphs)) continue;
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
}
