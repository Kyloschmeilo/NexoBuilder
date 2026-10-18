/**
 * The project-level sections of a CraftEngine pack that have no item behind them: the server translations
 * (configuration/translations.yml), and the checks of these sections and of the project's own lang keys.
 */
import { createIssue, type Issue } from '@resourcepackbuilder/utils';
import {
  craftEngineServerTranslations,
  invalidLocales,
  projectLang,
  projectServerTranslations,
} from '@resourcepackbuilder/core/craftEngine';
import { sectionsToYaml } from '@resourcepackbuilder/core/craftEngine';
import type { Project } from '@resourcepackbuilder/core/project';
import { craftEngineConfigFile } from './layout';

/** The config files of the project-level sections, by their path relative to plugins/CraftEngine. */
export function planProjectSections(project: Project): Map<string, string> {
  const out = new Map<string, string>();
  const translations = craftEngineServerTranslations(project);
  if (Object.keys(translations).length > 0) {
    out.set(craftEngineConfigFile(project, 'translations'), sectionsToYaml({ translations }, `server translations of "${project.name}"`));
  }
  return out;
}

/** The issues of the project-level sections: locales CraftEngine cannot read, which the export leaves out. */
export function projectSectionIssues(project: Project): Issue[] {
  return [
    ...invalidLocales(projectServerTranslations(project)).map((locale) =>
      createIssue('warning', 'ce.translationsLocaleInvalid', { locale }),
    ),
    ...invalidLocales(projectLang(project)).map((locale) => createIssue('warning', 'ce.langLocaleInvalid', { locale })),
  ];
}
