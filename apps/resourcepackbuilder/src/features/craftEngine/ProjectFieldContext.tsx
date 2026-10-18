import type { ReactNode } from 'react';
import { craftEngineProjectSuggestions, projectGlobalVariables, resolveGlobalVariables } from '@resourcepackbuilder/core/craftEngine';
import { FieldContext, type FieldContextValue } from '../../components/editor';
import { useOpenProject } from '../../store/project';

/**
 * The field context of the CraftEngine project pages (loot sources, templates, global variables, attributes and the
 * other project sections): no textures of their own, the project's templates, attributes, categories and more as
 * suggestions and its global variables in the MiniMessage previews.
 */
export function ProjectFieldContext({ children }: { children: ReactNode }) {
  const project = useOpenProject();
  const value: FieldContextValue = {
    minecraftVersion: project.settings.minecraftVersion,
    getAsset: () => undefined,
    uploadAsset: () => Promise.resolve(null),
    dynamicSuggestions: craftEngineProjectSuggestions(project),
    previewText: (text) => resolveGlobalVariables(text, projectGlobalVariables(project)),
  };
  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}
