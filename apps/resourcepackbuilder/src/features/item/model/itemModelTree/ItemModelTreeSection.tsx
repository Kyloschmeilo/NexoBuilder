/**
 * The item's own item model tree on the model tab: a button that creates it (starting with the item's own model),
 * the root keys of the definition (Nexo only; CraftEngine edits them as item keys of the model group), and the tree.
 */
import { useTranslations } from 'next-intl';
import { Network, Trash2 } from 'lucide-react';
import {
  type ConfigValue,
  ITEM_MODEL_ROOT_KEYS,
  ITEM_MODEL_ROOT_VERSIONS,
  type Item,
  type ItemModelDefinition,
  newItemModelDefinition,
} from '@resourcepackbuilder/core/project';
import { SectionCard } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { setItemModelTree } from '../../../../commands/itemModel';
import { useOpenProject } from '../../../../store/project';
import { NodeEditor } from './NodeEditor';
import { ParamField } from './ParamField';

/** The root keys besides `model`, as the Nexo ItemModel builder reads them. */
function RootKeys({ item, definition }: { item: Item; definition: ItemModelDefinition }) {
  const t = useTranslations('schema');
  const set = (key: (typeof ITEM_MODEL_ROOT_KEYS)[number], value: ConfigValue | undefined) => {
    const next: ItemModelDefinition = { ...definition };
    if (value === undefined) delete next[key];
    else (next as unknown as Record<string, ConfigValue>)[key] = value;
    setItemModelTree(item.id, next, `root.${key}`);
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{t('itemModel.ui.rootKeysHelp')}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {ITEM_MODEL_ROOT_KEYS.map((key) => (
          <ParamField
            key={key}
            param={{ key, kind: key === 'swap_animation_scale' ? 'number' : 'boolean', minVersion: ITEM_MODEL_ROOT_VERSIONS[key] }}
            value={definition[key]}
            onChange={(value) => set(key, value)}
          />
        ))}
      </div>
    </div>
  );
}

/** The item model tree section of an item. */
export function ItemModelTreeSection({ item }: { item: Item }) {
  const t = useTranslations('schema');
  const target = useOpenProject().target;
  const definition = item.itemModel;
  return (
    <SectionCard
      icon={<Network className="size-4.5" />}
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
        <div className="flex flex-col gap-4">
          {target === 'nexo' && <RootKeys item={item} definition={definition} />}
          <NodeEditor
            node={definition.model}
            label={t('itemModel.ui.root')}
            pathKey="model"
            onChange={(model, historyKey) => setItemModelTree(item.id, { ...definition, model }, historyKey)}
          />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-muted-foreground">{t('itemModel.ui.createHelp')}</p>
          <Button variant="outline" size="sm" onClick={() => setItemModelTree(item.id, newItemModelDefinition())}>
            {t('itemModel.ui.create')}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}
