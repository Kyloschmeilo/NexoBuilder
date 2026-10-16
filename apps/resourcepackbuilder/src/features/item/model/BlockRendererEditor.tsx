/** The entity renderers of a CraftEngine block's state or appearances: whether they hide the model, and their elements. */
import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
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
import { DisplayElementList, withKey } from './DisplayElementsEditor';
import { BlockRendererPreview } from './FurniturePreview';

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
          <p className="text-xs text-muted-foreground">{t('ceBlock.renderer.previewHelp')}</p>
        </div>
      )}
      <DisplayElementList
        elements={elements}
        edit={(next, historyKey) =>
          edit((s) => withRendererElements(s, next(rendererElements(s) as ConfigValue[]) as ConfigObject[]), historyKey)
        }
        newElement={newRendererElement}
        defaultPosition={rendererDefaultPosition}
        title={t('ceBlock.renderer.elements')}
        help={t('ceBlock.renderer.elementsHelp')}
      />
    </div>
  );
}

/**
 * The entity renderer of the block's single state, or of one of its appearances (picked in a select); `edit` changes
 * the state or appearance of the name.
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('ceBlock.renderer.title')}</span>
        <p className="text-xs text-muted-foreground">{t('ceBlock.renderer.help')}</p>
      </div>
      {looks.length > 1 && (
        <label htmlFor={selectId} className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t('ceBlock.renderer.look')}</span>
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
    </div>
  );
}
