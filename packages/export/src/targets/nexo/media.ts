/**
 * Glyphs, sounds, paintings and dialogs in plugins/Nexo: the glyph file, the dialog files and the root file entries
 * (pack files: see ../../media).
 */
import { mediaKey, type Project, validateDialogs } from '@resourcepackbuilder/core/project';
import type { Issue } from '@resourcepackbuilder/utils';
import { buildDialogFiles, buildGlyphFile, glyphFilePath, paintingToYaml, soundToYaml } from '@resourcepackbuilder/core/nexo';
import { writeMediaPackFiles } from '../../media';
import type { PackWriter } from '../../packWriter';
import type { NexoRootEntries } from '../../types';

/** The glyph and dialog files (relative to plugins/Nexo) and the root file entries of the media. */
interface MediaFiles extends Omit<NexoRootEntries, 'multipack'> {
  glyphFiles: Map<string, string>;
  dialogFiles: Map<string, string>;
}

export function writeMedia(writer: PackWriter, project: Project, issues: Issue[]): MediaFiles {
  writeMediaPackFiles(writer, project, issues, { gifGlyphs: true });
  issues.push(...validateDialogs(project));
  const glyphYaml = buildGlyphFile(project);
  return {
    glyphFiles: new Map(glyphYaml ? [[glyphFilePath(project), glyphYaml]] : []),
    dialogFiles: buildDialogFiles(project),
    soundEntries: project.sounds.map((sound) => soundToYaml(project, sound)),
    paintingEntries: Object.fromEntries(project.paintings.map((p) => [mediaKey(project, p.paintingId), paintingToYaml(project, p)])),
  };
}
