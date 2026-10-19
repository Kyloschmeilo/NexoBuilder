/**
 * The item's own item model tree as a section panel. Without a tree it says what the item uses and offers to create
 * one (starting with the item's own model). With a tree it shows the outline of the nodes beside the card of the
 * selected node (stacked while the section is narrow), and for Nexo the root keys of the definition under "Definition
 * keys" (CraftEngine edits them as item keys of the model group).
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import {
  type ConfigValue,
  ITEM_MODEL_ROOT_KEYS,
  ITEM_MODEL_ROOT_VERSIONS,
  type Item,
  type ItemModelDefinition,
  itemModelNodeAt,
  type ItemModelPath,
  newItemModelDefinition,
} from '@resourcepackbuilder/core/project';
import { EmptyHint, FieldGroup, Help, MoreOptions, Section } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { setItemModelTree } from '../../../../commands/itemModel';
import { useOpenProject } from '../../../../store/project';
import { NodeEditor } from './NodeEditor';
import { ParamField } from './ParamField';
import { TreeOutline } from './TreeOutline';
import { nodeIssueKey, useNodeIssues } from './useNodeIssues';

/** The root keys besides `model`, as the Nexo ItemModel builder reads them. */
function RootKeys({ item, definition }: { item: Item; definition: ItemModelDefinition }) {
  const t = useTranslations('item');
  const set = (key: (typeof ITEM_MODEL_ROOT_KEYS)[number], value: ConfigValue | undefined) => {
    const next: ItemModelDefinition = { ...definition };
    if (value === undefined) delete next[key];
    else (next as unknown as Record<string, ConfigValue>)[key] = value;
    setItemModelTree(item.id, next, `root.${key}`);
  };
  return (
    <MoreOptions
      label={t('modelTree.rootKeys')}
      count={ITEM_MODEL_ROOT_KEYS.length}
      hasValue={ITEM_MODEL_ROOT_KEYS.some((key) => definition[key] !== undefined)}
    >
      <FieldGroup>
        {ITEM_MODEL_ROOT_KEYS.map((key) => (
          <ParamField
            key={key}
            param={{ key, kind: key === 'swap_animation_scale' ? 'number' : 'boolean', minVersion: ITEM_MODEL_ROOT_VERSIONS[key] }}
            value={definition[key]}
            onChange={(value) => set(key, value)}
          />
        ))}
      </FieldGroup>
    </MoreOptions>
  );
}

/** The outline and the card of the selected node; the selection falls back to the root when its node is gone. */
function TreeEditor({ item, definition }: { item: Item; definition: ItemModelDefinition }) {
  const [selected, setSelected] = useState<ItemModelPath>([]);
  const issues = useNodeIssues(item.id);
  const root = definition.model;
  const path = itemModelNodeAt(root, selected) ? selected : [];
  const onChange = (model: typeof root, historyKey?: string) => setItemModelTree(item.id, { ...definition, model }, historyKey);
  return (
    <div className="grid min-w-0 gap-3 @3xl/section:grid-cols-[minmax(13rem,2fr)_minmax(0,3fr)] @3xl/section:items-start">
      <TreeOutline root={root} selected={path} onSelect={setSelected} issues={issues} />
      <NodeEditor
        key={path.join('.')}
        root={root}
        path={path}
        onChange={onChange}
        onSelect={setSelected}
        issues={issues.get(nodeIssueKey(path))}
      />
    </div>
  );
}

/** The item model tree section of an item. */
export function ItemModelTreeSection({ item, id }: { item: Item; id?: string }) {
  const t = useTranslations('schema');
  const tItem = useTranslations('item');
  const target = useOpenProject().target;
  const definition = item.itemModel;
  return (
    <Section
      id={id}
      title={t('itemModel.ui.title')}
      description={t('itemModel.ui.description')}
      actions={
        definition && (
          <Button variant="ghost" size="sm" onClick={() => setItemModelTree(item.id, undefined)}>
            <Trash2 /> {t('itemModel.ui.remove')}
          </Button>
        )
      }
    >
      {definition ? (
        <div className="flex min-w-0 flex-col gap-3">
          <TreeEditor key={item.id} item={item} definition={definition} />
          {target === 'nexo' && <RootKeys item={item} definition={definition} />}
        </div>
      ) : (
        <EmptyHint actionLabel={t('itemModel.ui.create')} onAction={() => setItemModelTree(item.id, newItemModelDefinition())}>
          <span className="inline-flex items-center gap-1">
            {tItem('modelTree.emptyText')}
            <Help>{t('itemModel.ui.createHelp')}</Help>
          </span>
        </EmptyHint>
      )}
    </Section>
  );
}
