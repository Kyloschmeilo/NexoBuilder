/** The docs page of an item model node type for the open project's plugin. */
import { useCallback } from 'react';
import { ceItemModelDocs } from '@resourcepackbuilder/core/craftEngine';
import { nexoItemModelDocs } from '@resourcepackbuilder/core/nexo';
import { useOpenProject } from '../../../../store/project';

/** Returns the CraftEngine wiki or Nexo docs page of a node type (e.g. `minecraft:select`). */
export function useItemModelDocs(): (type: string) => string {
  const target = useOpenProject().target;
  return useCallback((type: string) => (target === 'craftengine' ? ceItemModelDocs(type) : nexoItemModelDocs(type)), [target]);
}
