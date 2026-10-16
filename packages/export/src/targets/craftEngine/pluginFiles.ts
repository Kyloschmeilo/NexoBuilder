/**
 * The files of plugins/CraftEngine: the project's pack.yml, its item configs (with their blocks, furniture and
 * recipes) grouped by file and the configs of its glyphs, sounds and paintings.
 */
import { createIssue, groupBy, type Issue, type IssueCode, type MessageArgs } from '@resourcepackbuilder/utils';
import {
  craftEngineGlyphs,
  craftEngineJukeboxSong,
  craftEnginePainting,
  craftEngineSound,
  type CraftEngineSections,
  sectionsToYaml,
  buildPackYml,
} from '@resourcepackbuilder/core/craftEngine';
import { type Glyph, mediaFrame, mediaKey, type Project, validateRecipes } from '@resourcepackbuilder/core/project';
import { writeMediaPackFiles } from '../../media';
import type { PackWriter } from '../../packWriter';
import type { FileContent, ItemPlan } from '../../types';
import type { TargetPluginFiles } from '../types';
import { exportPackName } from '../../paths';
import { CRAFT_ENGINE_RESERVED_PACK_NAME, craftEngineMediaFile, packYmlFile } from './layout';
import { blockProjectIssues } from './validate';

export function planCraftEnginePluginFiles(project: Project, plans: ItemPlan[], writer: PackWriter, issues: Issue[]): TargetPluginFiles {
  const pluginFiles = new Map<string, FileContent>([[packYmlFile(project), buildPackYml(project)]]);
  for (const [file, list] of groupBy(plans, (p) => p.yamlFile)) {
    const items = Object.fromEntries(list.map((p) => [p.yamlKey, p.config]));
    const blocks = Object.assign({}, ...list.map((p) => p.sections?.blocks));
    const furniture = Object.assign({}, ...list.map((p) => p.sections?.furniture));
    const recipes = Object.assign({}, ...list.map((p) => p.sections?.recipes));
    pluginFiles.set(file, sectionsToYaml({ items, blocks, furniture, recipes }, `project "${project.name}"`));
  }
  const packName = exportPackName(project);
  if (CRAFT_ENGINE_RESERVED_PACK_NAME.test(packName)) issues.push(createIssue('error', 'ce.reservedPackName', { name: packName }));
  issues.push(
    ...validateRecipes(
      project,
      plans.map((p) => p.item),
    ),
  );
  issues.push(...blockProjectIssues(project));
  for (const [path, text] of planMedia(project, writer, issues)) pluginFiles.set(path, text);
  return { pluginFiles };
}

/** Media checks that only apply to Nexo (GIF shaders, Nexo's painting datapack) or that CraftEngine reports itself. */
const NOT_FOR_CRAFT_ENGINE = new Set<IssueCode>(['glyph.animatedShaders', 'glyph.referenceNotInProject', 'painting.datapackNeedsVersion']);

/** Writes the media into the pack and returns their config files: images (with emoji), sounds (with jukebox songs), paintings. */
function planMedia(project: Project, writer: PackWriter, issues: Issue[]): Map<string, string> {
  const mediaIssues: Issue[] = [];
  writeMediaPackFiles(writer, project, mediaIssues, { gifGlyphs: false });
  issues.push(...mediaIssues.filter((issue) => !NOT_FOR_CRAFT_ENGINE.has(issue.code)));

  const glyphs = craftEngineGlyphs(project);
  const reportGlyph = (glyph: Glyph, code: IssueCode, args?: MessageArgs) =>
    issues.push(
      createIssue('warning', code, args, { target: { kind: 'glyph', id: glyph.id }, context: [mediaFrame('glyph', glyph.glyphId)] }),
    );
  for (const glyph of glyphs.gifs) reportGlyph(glyph, 'ce.glyphGifUnsupported');
  for (const glyph of glyphs.unknownReferences) reportGlyph(glyph, 'ce.glyphReferenceUnknown', { reference: glyph.reference });

  const songs = project.sounds.flatMap((sound) => {
    const song = craftEngineJukeboxSong(project, sound);
    return song ? [[mediaKey(project, sound.soundId), song] as const] : [];
  });
  const files: Array<[string, CraftEngineSections, string]> = [
    [craftEngineMediaFile(project, 'images'), { images: glyphs.images, emoji: glyphs.emoji }, 'glyphs'],
    [
      craftEngineMediaFile(project, 'sounds'),
      {
        sounds: Object.fromEntries(project.sounds.map((sound) => [mediaKey(project, sound.soundId), craftEngineSound(project, sound)])),
        jukebox_songs: Object.fromEntries(songs),
      },
      'sounds',
    ],
    [
      craftEngineMediaFile(project, 'paintings'),
      { paintings: Object.fromEntries(project.paintings.map((p) => [mediaKey(project, p.paintingId), craftEnginePainting(p)])) },
      'paintings',
    ],
  ];
  const out = new Map<string, string>();
  for (const [path, sections, what] of files) {
    const text = sectionsToYaml(sections, `${what} of "${project.name}"`);
    // Without entries the text is only the header comment: leave the file out
    if (Object.values(sections).some((entries) => entries && Object.keys(entries).length > 0)) out.set(path, text);
  }
  return out;
}
