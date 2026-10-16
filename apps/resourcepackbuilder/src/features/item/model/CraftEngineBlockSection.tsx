import { useId } from 'react';
import { useTranslations } from 'next-intl';
import {
  blockBehaviorPropertyIds,
  blockBehaviorType,
  CE_BLOCK_BEHAVIOR_FORMS,
  craftEngineBlock,
} from '@resourcepackbuilder/core/craftEngine';
import { type Item } from '@resourcepackbuilder/core/project';
import { Field, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { CheckboxField } from '../../../components/CheckboxField';
import { Section } from '../../../components/Section';
import { setBlockBehavior, setCraftEngineBlock } from '../../../commands/items';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { CraftEngineStatesEditor } from './CraftEngineStatesEditor';

const BLOCK_SETTINGS_GROUP = 'blockSettings';
const BLOCK_BEHAVIOR_GROUP = 'blockBehavior';
/** The select's value for "no behavior" and for a behavior the editor has no form for */
const NONE = '';
const OTHER = 'other';

/** The behavior select: none, the behaviors with a form, and "other" while the YAML sets another one. */
function BehaviorSelect({ item, block }: { item: Item; block: Record<string, unknown> }) {
  const t = useTranslations('item');
  const id = useId();
  const type = blockBehaviorType(block);
  const hasForm = CE_BLOCK_BEHAVIOR_FORMS.some((form) => form.type === type);
  const value = type === null ? NONE : hasForm ? type : OTHER;
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id}>{t('ceBlock.behavior')}</FieldLabel>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        onChange={(e) => setBlockBehavior(item.id, e.target.value === NONE ? null : e.target.value)}
      >
        <NativeSelectOption value={NONE}>{t('ceBlock.behaviors.none')}</NativeSelectOption>
        {CE_BLOCK_BEHAVIOR_FORMS.map((form) => (
          // Behavior ids come from core at runtime; a test checks each has a name in en and de
          <NativeSelectOption key={form.type} value={form.type}>
            {t(`ceBlock.behaviors.${form.type}` as never)}
          </NativeSelectOption>
        ))}
        {value === OTHER && (
          <NativeSelectOption value={OTHER} disabled>
            {t('ceBlock.behaviors.other')}
          </NativeSelectOption>
        )}
      </NativeSelect>
      <FieldDescription className="text-xs">{t('ceBlock.behaviorHelp')}</FieldDescription>
    </Field>
  );
}

/**
 * CraftEngine: whether the item places a block of its own, its behavior, its states (the vanilla states it borrows,
 * `auto_state`) and the block settings. Shown for CraftEngine projects only (their form has the block settings group).
 */
export function CraftEngineBlockSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const block = craftEngineBlock(item.config);
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
          <BehaviorSelect item={item} block={block} />
          <PropertiesPanel item={item} group={BLOCK_BEHAVIOR_GROUP} only={blockBehaviorPropertyIds(block)} />
          <CraftEngineStatesEditor item={item} block={block} />
          <p className="text-xs text-muted-foreground">{t('ceBlock.model')}</p>
          <PropertiesPanel item={item} group={BLOCK_SETTINGS_GROUP} />
        </>
      )}
    </Section>
  );
}

/** Whether the project's form has CraftEngine's block settings (the section is shown only then). */
export const hasBlockSettings = (groups: Array<{ id: string }>) => groups.some((group) => group.id === BLOCK_SETTINGS_GROUP);
