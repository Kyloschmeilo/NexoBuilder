import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { CE_AUTO_STATE_GROUP_IDS, craftEngineBlock } from '@resourcepackbuilder/core/craftEngine';
import { type Item } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { Field, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { CheckboxField } from '../../../components/CheckboxField';
import { Section } from '../../../components/Section';
import { setBlockAutoState, setCraftEngineBlock } from '../../../commands/items';
import { PropertiesPanel } from '../properties/PropertiesPanel';

const BLOCK_SETTINGS_GROUP = 'blockSettings';

/** The block's `auto_state` group (simple or shared form), '' when it has none. */
function autoStateGroup(block: Record<string, unknown>): string {
  const state = isPlainObject(block.state) ? block.state : {};
  const auto = isPlainObject(state.auto_state) ? state.auto_state.type : state.auto_state;
  return typeof auto === 'string' ? auto : '';
}

/**
 * CraftEngine: whether the item places a block of its own, the vanilla states it borrows (`auto_state`) and the
 * block settings. Shown for CraftEngine projects only (their form has the block settings group).
 */
export function CraftEngineBlockSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const selectId = useId();
  const block = craftEngineBlock(item.config);
  const group = block ? autoStateGroup(block) : '';
  return (
    <Section title={t('ceBlock.title')} description={t('ceBlock.description')}>
      <CheckboxField
        checked={block !== null}
        onChange={(checked) => setCraftEngineBlock(item.id, checked)}
        label={t('ceBlock.toggle')}
        description={t('ceBlock.toggleHelp')}
      />
      {block && (
        <>
          <Field className="gap-1.5">
            <FieldLabel htmlFor={selectId}>{t('ceBlock.autoState')}</FieldLabel>
            <NativeSelect id={selectId} className="w-full" value={group} onChange={(e) => setBlockAutoState(item.id, e.target.value)}>
              {/* An unknown group from an imported config stays visible until another is chosen */}
              {!CE_AUTO_STATE_GROUP_IDS.includes(group) && <NativeSelectOption value={group}>{group}</NativeSelectOption>}
              {CE_AUTO_STATE_GROUP_IDS.map((id) => (
                <NativeSelectOption key={id} value={id}>
                  {id}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription className="text-xs">{t('ceBlock.autoStateHelp')}</FieldDescription>
          </Field>
          <p className="text-xs text-muted-foreground">{t('ceBlock.model')}</p>
          <PropertiesPanel item={item} group={BLOCK_SETTINGS_GROUP} />
        </>
      )}
    </Section>
  );
}

/** Whether the project's form has CraftEngine's block settings (the section is shown only then). */
export const hasBlockSettings = (groups: Array<{ id: string }>) => groups.some((group) => group.id === BLOCK_SETTINGS_GROUP);
