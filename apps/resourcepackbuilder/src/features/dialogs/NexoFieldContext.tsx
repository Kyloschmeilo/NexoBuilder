import type { ReactNode } from 'react';
import { nexoProjectSuggestions } from '@resourcepackbuilder/core/nexo';
import { FieldContext, type FieldContextValue } from '../../components/editor';
import { useOpenProject } from '../../store/project';

/**
 * The field context of a Nexo project's own pages (dialogs, multipack): no textures of their own, the project's
 * dialogs and multipack templates as suggestions.
 */
export function NexoFieldContext({ children }: { children: ReactNode }) {
  const project = useOpenProject();
  const value: FieldContextValue = {
    minecraftVersion: project.settings.minecraftVersion,
    getAsset: () => undefined,
    uploadAsset: () => Promise.resolve(null),
    dynamicSuggestions: nexoProjectSuggestions(project),
  };
  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}
