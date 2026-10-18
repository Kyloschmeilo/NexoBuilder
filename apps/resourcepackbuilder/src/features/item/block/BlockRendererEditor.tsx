/**
 * The entity renderers of a CraftEngine block's state or appearances: whether they hide the model, their elements and
 * their entity culling.
 */
import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CE_BLOCK_RENDERER_FIELDS,
  CE_DOCS,
  craftEngineBlock,
  CE_RENDERER_ELEMENT_FIELDS,
  isTransparentState,
  newRendererElement,
  rendererDefaultPosition,
  rendererElements,
  withRendererElements,
} from '@resourcepackbuilder/core/craftEngine';
import type { ConfigObject, ConfigValue, Item } from '@resourcepackbuilder/core/project';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { CheckboxField } from '../../../components/CheckboxField';
import { useOpenProject } from '../../../store/project';
import { updateCraftEngineBlock } from '../../../commands/items';
import { DisplayElementList, KeyedFields, withKey } from '../model/DisplayElementsEditor';
import { BlockRendererPreview } from '../model/FurniturePreview';

type StateEdit = (next: (state: ConfigObject) => ConfigObject, historyKey?: string) => void;

/** The renderer of one state or appearance. */
function BlockRendererEditor({
  item,
  stateName,
  state,
  edit,
}: {
  item: Item;
  /** The state's name (its appearance, `state` for a single state); the preview frames itself again when it changes */
  stateName: string;
  state: Record<string, unknown>;
  edit: StateEdit;
}) {
  const t = useTranslations('item');
  const project = useOpenProject();
  const elements = rendererElements(state) as ConfigValue[];
  return (
    <div className="flex flex-col gap-3">
      <CheckboxField
        checked={isTransparentState(state)}
        onChange={(checked) => edit((s) => withKey(s, 'transparent', checked ? true : undefined))}
        label={t('ceBlock.renderer.transparent')}
        description={t('ceBlock.renderer.transparentHelp')}
      />
      {elements.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <BlockRendererPreview project={project} item={item} stateName={stateName} state={state} />
          <p className="m-0 text-meta text-text-muted">{t('ceBlock.renderer.previewHelp')}</p>
        </div>
      )}
      <DisplayElementList
        elements={elements}
        edit={(next, historyKey) =>
          edit((s) => withRendererElements(s, next(rendererElements(s) as ConfigValue[]) as ConfigObject[]), historyKey)
        }
        newElement={newRendererElement}
        defaultPosition={rendererDefaultPosition}
        fields={CE_RENDERER_ELEMENT_FIELDS}
        title={t('ceBlock.renderer.elements')}
        help={t('ceBlock.renderer.elementsHelp')}
        docs={CE_DOCS.entityRenderer}
      />
    </div>
  );
}

/**
 * The entity renderer of the block's single state, or of one of its appearances (picked in a select); `edit` changes
 * the state or appearance of the name. The Block section shows it in a dialog titled with the renderer's name.
 */
export function BlockRendererSection({
  item,
  looks,
  edit,
}: {
  item: Item;
  /** The state (named `state`) or the appearances by name */
  looks: Array<[string, Record<string, unknown>]>;
  edit: (name: string, next: (state: ConfigObject) => ConfigObject, historyKey?: string) => void;
}) {
  const t = useTranslations('item');
  const selectId = useId();
  // The picked appearance, for the item it was picked on (the editor stays mounted when another item opens)
  const [picked, setPicked] = useState<{ itemId: string; name: string } | null>(null);
  const selected = picked?.itemId === item.id ? picked.name : null;
  const [name, look] = looks.find(([n]) => n === selected) ?? looks[0] ?? [];
  if (name === undefined || look === undefined) return null;
  // Entity culling belongs to the block (CraftEngine reads it there for all appearances)
  const block = craftEngineBlock(item.config) ?? {};
  const hasRenderer = looks.some(([, l]) => rendererElements(l).length > 0);
  return (
    <div className="flex flex-col gap-3">
      {looks.length > 1 && (
        <label htmlFor={selectId} className="flex flex-col gap-1">
          <span className="text-meta text-text-muted">{t('ceBlock.renderer.look')}</span>
          <NativeSelect
            id={selectId}
            className="w-full"
            size="sm"
            value={name}
            onChange={(e) => setPicked({ itemId: item.id, name: e.target.value })}
          >
            {looks.map(([n, l]) => (
              <NativeSelectOption key={n} value={n}>
                {rendererElements(l).length > 0 ? `${n} (${rendererElements(l).length})` : n}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      )}
      <BlockRendererEditor
        item={item}
        stateName={name}
        state={look}
        edit={(next, historyKey) => edit(name, next, historyKey && `renderer-${name}-${historyKey}`)}
      />
      {hasRenderer && (
        <KeyedFields
          fields={CE_BLOCK_RENDERER_FIELDS}
          object={block}
          siblings={block}
          set={(key, value, historyKey) => updateCraftEngineBlock(item.id, (b) => withKey(b, key, value), historyKey)}
          historyKey="renderer-block"
        />
      )}
    </div>
  );
}
