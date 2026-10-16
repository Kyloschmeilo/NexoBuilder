import type { Item } from '@resourcepackbuilder/core/project/types';
import { resolveAsset } from '@resourcepackbuilder/core/project/assets';
import { addItemAsset } from '../../commands/items';
import type { FieldContextValue } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { usePngReader } from '../../hooks/useFileReaders';

/** What the property editors of an item need: the project's version and the item's extra textures. */
export function useItemFieldContext(item: Item): FieldContextValue {
  const project = useOpenProject();
  const readPng = usePngReader();
  return {
    minecraftVersion: project.settings.minecraftVersion,
    getAsset: (token) => resolveAsset(item, token),
    uploadAsset: async (file) => {
      const png = await readPng(file);
      return png ? addItemAsset(item.id, file.name, png.dataUrl) : null;
    },
  };
}
