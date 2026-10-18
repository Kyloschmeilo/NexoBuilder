/**
 * The project-level sections of a CraftEngine pack that have no item behind them: the server translations
 * (configuration/translations.yml), and the checks of these sections, of the project's own lang keys and of its
 * categories.
 */
import { createIssue, type Issue, issueCode, issueReporter } from '@resourcepackbuilder/utils';
import {
  CE_CATEGORY_ID,
  CE_CATEGORY_LIST,
  categoryEntryId,
  categoryKey,
  craftEngineServerTranslations,
  invalidLocales,
  projectCategories,
  projectLang,
  projectServerTranslations,
  sectionsToYaml,
} from '@resourcepackbuilder/core/craftEngine';
import { checkFieldValue } from '@resourcepackbuilder/core/form';
import { listEntryFrame, type Project, projectEntryFrame } from '@resourcepackbuilder/core/project';
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

/** The issues of the project-level sections: locales CraftEngine cannot read, bad category entries. */
export function projectSectionIssues(project: Project): Issue[] {
  return [
    ...invalidLocales(projectServerTranslations(project)).map((locale) =>
      createIssue('warning', 'ce.translationsLocaleInvalid', { locale }),
    ),
    ...invalidLocales(projectLang(project)).map((locale) => createIssue('warning', 'ce.langLocaleInvalid', { locale })),
    ...categoryIssues(project),
  ];
}

/** Each category needs an id CraftEngine reads, used once; its values are checked against the editor's fields. */
function categoryIssues(project: Project): Issue[] {
  const issues: Issue[] = [];
  const keys = new Set<string>();
  projectCategories(project).forEach((entry, i) => {
    const id = categoryEntryId(entry);
    const report = issueReporter(issues, { context: [id ? projectEntryFrame('category', id) : listEntryFrame(i + 1)] });
    if (!id) report('error', 'ce.categoryIdMissing');
    else if (!CE_CATEGORY_ID.test(id)) report('error', 'ce.categoryIdInvalid', { id });
    else {
      const key = categoryKey(project, id);
      if (keys.has(key)) report('error', 'ce.categoryIdDuplicate', { id: key });
      keys.add(key);
    }
    // The frame of the list entry is replaced by that of the category
    for (const found of checkFieldValue([entry], CE_CATEGORY_LIST)) {
      report('warning', issueCode(found.code), found.args, found.context.slice(1));
    }
  });
  return issues;
}
