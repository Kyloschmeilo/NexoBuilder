/**
 * The project-level sections of a CraftEngine pack that have no item behind them: the server translations
 * (configuration/translations.yml), the worldgen features (worldgen.yml) and the atlases (atlases.yml), and the checks
 * of these sections, of the project's own lang keys and of its categories.
 */
import { createIssue, type Issue, issueCode, issueReporter } from '@resourcepackbuilder/utils';
import {
  CE_ATLAS_LIST,
  CE_CATEGORY_LIST,
  CE_CONFIGURED_FEATURE_LIST,
  CE_ENTRY_ID,
  CE_PLACED_FEATURE_LIST,
  craftEngineAtlases,
  craftEngineServerTranslations,
  craftEngineWorldgen,
  hasBiomeModifier,
  invalidLocales,
  keyedEntries,
  projectAtlases,
  projectCategories,
  projectConfiguredFeatures,
  projectEntryId,
  projectEntryKey,
  projectLang,
  projectPlacedFeatures,
  projectServerTranslations,
  sectionsToYaml,
} from '@resourcepackbuilder/core/craftEngine';
import { checkFieldValue, type ObjectListField } from '@resourcepackbuilder/core/form';
import { type ConfigObject, listEntryFrame, type Project, projectEntryFrame } from '@resourcepackbuilder/core/project';
import { craftEngineConfigFile } from './layout';

/** The config files of the project-level sections, by their path relative to plugins/CraftEngine. */
export function planProjectSections(project: Project): Map<string, string> {
  const out = new Map<string, string>();
  const translations = craftEngineServerTranslations(project);
  if (Object.keys(translations).length > 0) {
    out.set(craftEngineConfigFile(project, 'translations'), sectionsToYaml({ translations }, `server translations of "${project.name}"`));
  }
  const worldgen = craftEngineWorldgen(project);
  if (Object.values(worldgen).some((section) => Object.keys(section).length > 0)) {
    out.set(craftEngineConfigFile(project, 'worldgen'), sectionsToYaml(worldgen, `worldgen features of "${project.name}"`));
  }
  const atlases = craftEngineAtlases(project);
  if (Object.keys(atlases).length > 0) {
    out.set(craftEngineConfigFile(project, 'atlases'), sectionsToYaml({ atlases }, `atlases of "${project.name}"`));
  }
  return out;
}

/** The issues of the project-level sections. */
export function projectSectionIssues(project: Project): Issue[] {
  return [
    ...invalidLocales(projectServerTranslations(project)).map((locale) =>
      createIssue('warning', 'ce.translationsLocaleInvalid', { locale }),
    ),
    ...invalidLocales(projectLang(project)).map((locale) => createIssue('warning', 'ce.langLocaleInvalid', { locale })),
    ...entryIssues(project, 'category', projectCategories(project), CE_CATEGORY_LIST),
    ...entryIssues(project, 'configuredFeature', projectConfiguredFeatures(project), CE_CONFIGURED_FEATURE_LIST, (entry, report) => {
      if (typeof entry.type !== 'string' || !entry.type.trim()) report('error', 'ce.configuredFeatureTypeMissing');
    }),
    ...placedFeatureIssues(project),
    ...entryIssues(project, 'atlas', projectAtlases(project), CE_ATLAS_LIST, (entry, report) => {
      if (!Array.isArray(entry.sources) || entry.sources.length === 0) report('warning', 'ce.atlasSourcesMissing');
    }),
  ];
}

type Report = ReturnType<typeof issueReporter>;

/**
 * The issues of a list of entries: each needs an id CraftEngine reads, used once in the list; its values are checked
 * against the editor's fields, and by `check` if given.
 */
function entryIssues(
  project: Project,
  kind: Parameters<typeof projectEntryFrame>[0],
  entries: readonly ConfigObject[],
  list: ObjectListField,
  check?: (entry: ConfigObject, report: Report) => void,
): Issue[] {
  const issues: Issue[] = [];
  const keys = new Set<string>();
  entries.forEach((entry, i) => {
    const id = projectEntryId(entry);
    const report = issueReporter(issues, { context: [id ? projectEntryFrame(kind, id) : listEntryFrame(i + 1)] });
    if (!id) report('error', 'ce.sectionEntryIdMissing');
    else if (!CE_ENTRY_ID.test(id)) report('error', 'ce.sectionEntryIdInvalid', { id });
    else {
      const key = projectEntryKey(project, id);
      if (keys.has(key)) report('error', 'ce.sectionEntryIdDuplicate', { id: key });
      keys.add(key);
    }
    // The frame of the list entry is replaced by that of the entry
    for (const found of checkFieldValue([entry], list)) {
      report('warning', issueCode(found.code), found.args, found.context.slice(1));
    }
    check?.(entry, report);
  });
  return issues;
}

/**
 * A placed feature needs a feature: a configured feature of the project, of the vanilla game or another pack (only a
 * reference into the project's namespace is checked), or one inline. A `biome` filter only works with the
 * `minecraft:biome` modifier in its placement.
 */
function placedFeatureIssues(project: Project): Issue[] {
  const configured = new Set(keyedEntries(project, projectConfiguredFeatures(project)).keys());
  return entryIssues(project, 'placedFeature', projectPlacedFeatures(project), CE_PLACED_FEATURE_LIST, (entry, report) => {
    const feature = entry.feature;
    if (feature === undefined || feature === null || (typeof feature === 'string' && !feature.trim())) {
      report('error', 'ce.placedFeatureFeatureMissing');
    } else if (typeof feature === 'string') {
      const key = projectEntryKey(project, feature);
      if (key.startsWith(`${project.namespace}:`) && !configured.has(key)) report('warning', 'ce.placedFeatureUnknown', { feature: key });
    }
    const biomes = entry.biome;
    if (((Array.isArray(biomes) && biomes.length > 0) || typeof biomes === 'string') && !hasBiomeModifier(entry.placement)) {
      report('warning', 'ce.placedFeatureBiomeWithoutModifier');
    }
  });
}
