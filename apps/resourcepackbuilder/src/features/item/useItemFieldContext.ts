import {
  projectAttributeOptions,
  projectGlobalVariables,
  projectTemplateOptions,
  resolveGlobalVariables,
} from '@resourcepackbuilder/core/craftEngine';
import { nexoProjectSuggestions } from '@resourcepackbuilder/core/nexo';
import { type Item, resolveAsset } from '@resourcepackbuilder/core/project';
import { addItemAsset } from '../../commands/items';
import type { FieldContextValue } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { usePngReader } from '../../hooks/useFileReaders';

/**
 * What the property editors of an item need: the project's version and the item's extra textures; in a CraftEngine
 * project also its templates, attributes, operations and equipment sets (as suggestions) and its global variables
 * (filled into the MiniMessage previews); in a Nexo project the Carpentry block types (with the addon) and its
 * dialogs as suggestions.
 */
export function useItemFieldContext(item: Item): FieldContextValue {
  const project = useOpenProject();
  const readPng = usePngReader();
  const byTarget: Partial<FieldContextValue> =
    project.target === 'craftengine'
      ? {
          dynamicSuggestions: { templates: projectTemplateOptions(project), ...projectAttributeOptions(project) },
          previewText: (text) => resolveGlobalVariables(text, projectGlobalVariables(project)),
        }
      : { dynamicSuggestions: nexoProjectSuggestions(project) };
  return {
    ...byTarget,
    minecraftVersion: project.settings.minecraftVersion,
    getAsset: (token) => resolveAsset(item, token),
    uploadAsset: async (file) => {
      const png = await readPng(file);
      return png ? addItemAsset(item.id, file.name, png.dataUrl) : null;
    },
  };
}
