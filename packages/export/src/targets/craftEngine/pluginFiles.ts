/**
 * The files of plugins/CraftEngine: the project's pack.yml, its item configs (with their blocks, furniture and
 * recipes) grouped by file, the configs of its glyphs, sounds and paintings, its armor sets (equipments.yml), its
 * own categories and, with the project setting on, its folders as categories (categories.yml), its lang files (item
 * and block names and the project's own lang keys), its loot sources (loot_sources.yml), its templates
 * (templates.yml), its global variables (global_variables.yml), its attribute system (attributes.yml) and its other
 * project-level sections (projectSections.ts).
 */
import { createIssue, groupBy, type Issue, type IssueCode, type IssueLevel, type MessageArgs } from '@resourcepackbuilder/utils';
import { formatResourceLocation } from '@resourcepackbuilder/minecraft';
import {
  craftEngineAttributeSections,
  craftEngineCategories,
  craftEngineProjectCategories,
  craftEngineGlobalVariables,
  craftEngineGlyphs,
  craftEngineLang,
  craftEngineJukeboxSong,
  craftEngineLootSources,
  craftEnginePainting,
  craftEngineSound,
  craftEngineTemplates,
  type CraftEngineSections,
  sectionsToYaml,
  buildPackYml,
} from '@resourcepackbuilder/core/craftEngine';
import { type Glyph, mediaFrame, mediaKey, type Project, validateRecipes } from '@resourcepackbuilder/core/project';
import { armorSetLayers, collectArmorSets } from '../../equipment';
import { writeMediaPackFiles } from '../../media';
import type { PackWriter } from '../../packWriter';
import type { FileContent, ItemPlan } from '../../types';
import type { TargetPluginFiles } from '../types';
import { exportPackName } from '../../paths';
import { CRAFT_ENGINE_RESERVED_PACK_NAME, craftEngineConfigFile, craftEngineMediaFile, packYmlFile } from './layout';
import { attributeProjectIssues } from './attributes';
import { blockProjectIssues, lootSourceIssues, templateProjectIssues } from './validate';
import { planProjectSections, projectSectionIssues } from './projectSections';

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
  issues.push(
    ...blockProjectIssues(project),
    ...lootSourceIssues(project),
    ...templateProjectIssues(project),
    ...attributeProjectIssues(project),
    ...projectSectionIssues(project),
  );
  const projectSections = [
    ['loot_sources', craftEngineLootSources(project), 'loot sources'],
    ['templates', craftEngineTemplates(project), 'templates'],
    ['global_variables', craftEngineGlobalVariables(project), 'global variables'],
  ] as const;
  for (const [name, section, label] of projectSections) {
    if (Object.keys(section).length === 0) continue;
    pluginFiles.set(craftEngineConfigFile(project, name), sectionsToYaml({ [name]: section }, `${label} of "${project.name}"`));
  }
  // The attribute system in one file: CraftEngine replaces all damage rules with each `damage_rules` section it reads
  const attributes = craftEngineAttributeSections(project);
  if (Object.values(attributes).some((section) => Object.keys(section).length > 0)) {
    pluginFiles.set(
      craftEngineConfigFile(project, 'attributes'),
      sectionsToYaml(attributes, `attributes of "${project.name}" (needs attribute.enable: true in config.yml)`),
    );
  }
  for (const [path, text] of planMedia(project, writer, issues)) pluginFiles.set(path, text);
  for (const [path, text] of planItemExtras(project, plans)) pluginFiles.set(path, text);
  for (const [path, text] of planProjectSections(project)) pluginFiles.set(path, text);
  return { pluginFiles };
}

/**
 * The config files the items share: equipments.yml (one component equipment per armor set, the same model the shared
 * export writes into the pack, which CraftEngine merges with it), categories.yml and the lang files (the items'
 * display names, the client names of their blocks and the project's own lang keys).
 */
function planItemExtras(project: Project, plans: ItemPlan[]): Map<string, string> {
  const out = new Map<string, string>();
  const items = plans.map((p) => p.item);
  // The shared export already reported the sets' issues
  const sets = collectArmorSets(items, project.settings.minecraftVersion, []);
  const equipments = Object.fromEntries(
    [...armorSetLayers(sets)].map(([setId, layers]) => {
      const assetId = formatResourceLocation(project.namespace, setId);
      return [assetId, { type: 'component', ...Object.fromEntries(layers.map((layer) => [layer, assetId])) }];
    }),
  );
  if (Object.keys(equipments).length > 0) {
    out.set(craftEngineConfigFile(project, 'equipments'), sectionsToYaml({ equipments }, `armor sets of "${project.name}"`));
  }
  // The project's own categories win over a folder's category with the same id
  const fromFolders = project.settings.ceCategoriesFromFolders ? craftEngineCategories(project, items) : {};
  const categories = { ...fromFolders, ...craftEngineProjectCategories(project) };
  if (Object.keys(categories).length > 0) {
    out.set(craftEngineConfigFile(project, 'categories'), sectionsToYaml({ categories }, `categories of "${project.name}"`));
  }
  const blockItems = plans.flatMap((p) => (p.sections?.blocks ? [p.item] : []));
  for (const [locale, texts] of craftEngineLang(project, items, blockItems)) {
    out.set(
      craftEngineConfigFile(project, `lang/${locale}`),
      sectionsToYaml({ lang: { [locale]: texts } }, `translations of "${project.name}"`),
    );
  }
  return out;
}

/** Media checks that only apply to Nexo (GIF shaders, Nexo's painting datapack) or that CraftEngine reports itself. */
const NOT_FOR_CRAFT_ENGINE = new Set<IssueCode>(['glyph.animatedShaders', 'glyph.referenceNotInProject', 'painting.datapackNeedsVersion']);

/** Writes the media into the pack and returns their config files: images (with emoji), sounds (with jukebox songs), paintings. */
function planMedia(project: Project, writer: PackWriter, issues: Issue[]): Map<string, string> {
  const mediaIssues: Issue[] = [];
  writeMediaPackFiles(writer, project, mediaIssues, { gifGlyphs: false });
  issues.push(...mediaIssues.filter((issue) => !NOT_FOR_CRAFT_ENGINE.has(issue.code)));

  const glyphs = craftEngineGlyphs(project);
  const reportGlyph = (glyph: Glyph, code: IssueCode, args?: MessageArgs, level: IssueLevel = 'warning') =>
    issues.push(createIssue(level, code, args, { target: { kind: 'glyph', id: glyph.id }, context: [mediaFrame('glyph', glyph.glyphId)] }));
  for (const glyph of glyphs.gifs) reportGlyph(glyph, 'ce.glyphGifUnsupported');
  for (const glyph of glyphs.unknownReferences) reportGlyph(glyph, 'ce.glyphReferenceUnknown', { reference: glyph.reference });
  for (const glyph of glyphs.unusedPermissions) reportGlyph(glyph, 'ce.glyphPermissionUnused', undefined, 'info');

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
