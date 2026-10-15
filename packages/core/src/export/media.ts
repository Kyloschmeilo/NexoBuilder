/** Glyphs, sounds and paintings: their pack files, plugin files and checks. */
import type { Issue, IssueTarget } from '../issues';
import { buildGlyphFile, glyphFilePath, glyphTexturePath } from '../nexo/glyphs/files';
import { validateGlyphs } from '../nexo/glyphs/validate';
import { paintingMcmeta, paintingTexturePath, paintingToYaml } from '../nexo/paintings/files';
import { paintingKey } from '../nexo/paintings/model';
import { validatePaintings } from '../nexo/paintings/validate';
import { soundFilePath, soundToYaml } from '../nexo/sounds/files';
import { validateSounds } from '../nexo/sounds/validate';
import type { Project } from '../project/types';
import type { PackWriter } from './packWriter';
import type { ExportPlan } from './types';

type MediaFiles = Pick<ExportPlan, 'glyphFiles' | 'soundEntries' | 'paintingEntries'>;

export function writeMedia(writer: PackWriter, project: Project, issues: Issue[]): MediaFiles {
  const reportFor = (target: IssueTarget) => (issue: Issue) => issues.push({ ...issue, target });
  issues.push(...validateGlyphs(project), ...validateSounds(project), ...validatePaintings(project));

  for (const glyph of project.glyphs) {
    const path = glyphTexturePath(project, glyph);
    if (path && glyph.file) writer.binary(path, glyph.file.dataUrl, { report: reportFor({ kind: 'glyph', id: glyph.id }) });
  }
  for (const sound of project.sounds) {
    const report = reportFor({ kind: 'sound', id: sound.id });
    sound.files.forEach((file, i) =>
      writer.binary(`assets/${project.namespace}/sounds/${soundFilePath(sound, i)}.ogg`, file.dataUrl, { report }),
    );
  }
  for (const painting of project.paintings) {
    if (!painting.file) continue;
    const path = paintingTexturePath(project, painting);
    const mcmeta = paintingMcmeta(painting);
    if (writer.binary(path, painting.file.dataUrl, { report: reportFor({ kind: 'painting', id: painting.id }) }) && mcmeta) {
      writer.json(`${path}.mcmeta`, mcmeta);
    }
  }

  const glyphYaml = buildGlyphFile(project);
  return {
    glyphFiles: new Map(glyphYaml ? [[glyphFilePath(project), glyphYaml]] : []),
    soundEntries: project.sounds.map((sound) => soundToYaml(project, sound)),
    paintingEntries: Object.fromEntries(project.paintings.map((p) => [paintingKey(project, p), paintingToYaml(project, p)])),
  };
}
