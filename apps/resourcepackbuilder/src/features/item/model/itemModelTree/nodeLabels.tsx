/**
 * How a node of the item model tree is named in the outline and in its card: an icon per node type, the slot it sits
 * in ("When true", "Case minecraft:zombie", "From 0.5", "Model 2", "Fallback") and a one-line summary of its own value
 * (the model it shows, the property it reads, its special model).
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Box, CircleDashed, FileCode2, GitBranch, Layers, ListTree, Package, SlidersHorizontal, Sparkles } from 'lucide-react';
import {
  type ConfigObject,
  formatWhen,
  fullId,
  type ItemModelNode,
  itemModelNodeAt,
  type ItemModelPath,
  itemModelMessages,
  itemModelTypeDef,
  shortId,
} from '@resourcepackbuilder/core/project';
import { isPlainObject, MODEL_TOKEN } from '@resourcepackbuilder/utils';
import { cn } from '@resourcepackbuilder/ui/cn';
import { useSchemaText } from '../../../../components/useSchemaText';
import { nodeSlot } from './treePaths';

/** The icon of each node type. */
const TYPE_ICONS: Record<string, ReactNode> = {
  'minecraft:model': <Box />,
  'minecraft:composite': <Layers />,
  'minecraft:condition': <GitBranch />,
  'minecraft:select': <ListTree />,
  'minecraft:range_dispatch': <SlidersHorizontal />,
  'minecraft:special': <Sparkles />,
  'minecraft:empty': <CircleDashed />,
  'minecraft:bundle/selected_item': <Package />,
};

/** The square icon tile of a node type (a file icon for a type the editor does not know). */
export function NodeIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) {
  const known = itemModelTypeDef(type) !== undefined;
  return (
    <span
      aria-hidden
      className={cn(
        'grid flex-none place-items-center rounded-md',
        size === 'sm' ? 'size-5 [&_svg]:size-3' : 'size-6.5 [&_svg]:size-3.5',
        known ? 'bg-accent-soft text-primary' : 'bg-surface-sunken text-text-muted',
      )}
    >
      {TYPE_ICONS[fullId(type)] ?? <FileCode2 />}
    </span>
  );
}

/** The human name of a node's type; an unknown type is shown by its id. */
export function useTypeLabel(): (type: string) => string {
  const text = useSchemaText();
  return (type) => (itemModelTypeDef(type) ? text(itemModelMessages.typeLabel(fullId(type))) : type);
}

/** The name of the slot the node at `path` sits in. */
export function useSlotLabel(): (root: ItemModelNode, path: ItemModelPath) => string {
  const t = useTranslations('item');
  const tSchema = useTranslations('schema');
  return (root, path) => {
    const slot = nodeSlot(path);
    switch (slot.kind) {
      case 'root':
        return tSchema('itemModel.ui.root');
      case 'branch':
        return tSchema(slot.branch === 'on_true' ? 'itemModel.ui.onTrue' : 'itemModel.ui.onFalse');
      case 'fallback':
        return tSchema('itemModel.ui.fallback');
      case 'model':
        return t('modelTree.modelSlot', { index: slot.index + 1 });
      case 'case':
      case 'entry': {
        const parent = itemModelNodeAt(root, slot.parent);
        const list = parent?.[slot.list];
        const entry = Array.isArray(list) && isPlainObject(list[slot.index]) ? (list[slot.index] as ConfigObject) : {};
        if (slot.kind === 'entry') {
          const threshold = entry.threshold;
          return t('modelTree.entrySlot', { threshold: threshold === undefined ? '?' : String(threshold) });
        }
        const value = formatWhen(entry.when);
        return value ? t('modelTree.caseSlot', { value }) : t('modelTree.caseNoValue');
      }
    }
  };
}

/** The node's own value in a few words: its model, property or special model; empty when it has none. */
export function useNodeSummary(): (node: ItemModelNode) => string {
  return (node) => {
    switch (fullId(node.type)) {
      case 'minecraft:model':
        return typeof node.model === 'string' ? node.model : '';
      case 'minecraft:special': {
        const special = isPlainObject(node.model) ? (node.model as ConfigObject) : {};
        return typeof special.type === 'string' ? shortId(special.type) : '';
      }
      case 'minecraft:condition':
      case 'minecraft:select':
      case 'minecraft:range_dispatch':
        return typeof node.property === 'string' ? shortId(node.property) : '';
      default:
        return '';
    }
  };
}

/** The summary of a node after its type: an id in mono, or "the item's model" for the `@model` reference. */
export function NodeValue({ value }: { value: string }) {
  const t = useTranslations('schema');
  if (!value) return null;
  return value === MODEL_TOKEN ? (
    <span className="ml-1.5 text-meta font-normal text-text-muted">{t('itemModel.ui.useMainModel')}</span>
  ) : (
    <span className="ml-1.5 font-mono text-micro font-normal text-text-muted">{value}</span>
  );
}
