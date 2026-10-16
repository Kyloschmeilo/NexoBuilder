/** Glyphs, sounds and paintings in plugins/Nexo: the glyph file and the root file entries (pack files: see ../../media). */
import { mediaKey, type Project } from '@resourcepackbuilder/core/project';
import type { Issue } from '@resourcepackbuilder/utils';
import { buildGlyphFile, glyphFilePath, paintingToYaml, soundToYaml } from '@resourcepackbuilder/core/nexo';
import { writeMediaPackFiles } from '../../media';
import type { PackWriter } from '../../packWriter';
import type { NexoRootEntries } from '../../types';

/** The glyph file (relative to plugins/Nexo) and the root file entries. */
interface MediaFiles extends NexoRootEntries {
  glyphFiles: Map<string, string>;
}

export function writeMedia(writer: PackWriter, project: Project, issues: Issue[]): MediaFiles {
  writeMediaPackFiles(writer, project, issues, { gifGlyphs: true });
  const glyphYaml = buildGlyphFile(project);
  return {
    glyphFiles: new Map(glyphYaml ? [[glyphFilePath(project), glyphYaml]] : []),
    soundEntries: project.sounds.map((sound) => soundToYaml(project, sound)),
    paintingEntries: Object.fromEntries(project.paintings.map((p) => [mediaKey(project, p.paintingId), paintingToYaml(project, p)])),
  };
}
