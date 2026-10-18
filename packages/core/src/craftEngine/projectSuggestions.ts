/**
 * The suggestions a CraftEngine project offers its own fields (`dynamicSuggestions` of select and string list
 * fields): its templates, attributes, operations and equipment sets, its categories and what a category can list,
 * its worldgen features and its scripts.
 */
import type { Option } from '../form/options';
import type { Project } from '../project/types';
import { projectAttributeOptions } from './attributes';
import { projectCategoryMemberOptions, projectCategoryOptions } from './categories';
import { projectScriptOptions } from './scripts';
import { projectTemplateOptions } from './templates';
import { projectConfiguredFeatureOptions, projectPlacedFeatureOptions } from './worldgen';

/** Every list of suggestions of the project by the name a field asks for it with. */
export function craftEngineProjectSuggestions(project: Project): Record<string, Option[]> {
  return {
    templates: projectTemplateOptions(project),
    ...projectAttributeOptions(project),
    categories: projectCategoryOptions(project),
    categoryMembers: projectCategoryMemberOptions(project),
    configuredFeatures: projectConfiguredFeatureOptions(project),
    placedFeatures: projectPlacedFeatureOptions(project),
    scripts: projectScriptOptions(project),
  };
}
