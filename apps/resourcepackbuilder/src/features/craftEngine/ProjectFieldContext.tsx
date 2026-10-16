import type { ReactNode } from 'react';
import {
  projectAttributeOptions,
  projectGlobalVariables,
  projectTemplateOptions,
  resolveGlobalVariables,
} from '@resourcepackbuilder/core/craftEngine';
import { FieldContext, type FieldContextValue } from '../../components/editor';
import { useOpenProject } from '../../store/project';

/**
 * The field context of the CraftEngine project pages (loot sources, templates, global variables, attributes): no
 * textures of their own, the project's templates, attributes, operations and equipment sets as suggestions and its
 * global variables in the MiniMessage previews.
 */
export function ProjectFieldContext({ children }: { children: ReactNode }) {
  const project = useOpenProject();
  const value: FieldContextValue = {
    minecraftVersion: project.settings.minecraftVersion,
    getAsset: () => undefined,
    uploadAsset: () => Promise.resolve(null),
    dynamicSuggestions: { templates: projectTemplateOptions(project), ...projectAttributeOptions(project) },
    previewText: (text) => resolveGlobalVariables(text, projectGlobalVariables(project)),
  };
  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}
