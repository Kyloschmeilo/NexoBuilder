import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import {
  blockBehaviorPropertyIds,
  blockBehaviorReplacesStates,
  blockBehaviorType,
  CE_BLOCK_BEHAVIOR_FORMS,
  CE_BLOCK_BEHAVIORS,
  craftEngineBlock,
  craftEngineFurniture,
  craftEngineItemKey,
  hasStorageOpenLook,
} from '@resourcepackbuilder/core/craftEngine';
import { findTypedType } from '@resourcepackbuilder/core/form';
import { type ConfigObject, type Item, toConfigValue } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { IconButton, SectionCard } from '@resourcepackbuilder/ui';
import { Field, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { CheckboxField } from '../../../components/CheckboxField';
import { Section } from '../../../components/Section';
import { TypedEntryBody } from '../../../components/editor/editors/TypedListEditor';
import { setBlockBehavior, setBlockStorageOpenLook, setCraftEngineBlock, updateCraftEngineBlock } from '../../../commands/items';
import { confirm } from '../../../store/dialogs';
import { useOpenProject } from '../../../store/project';
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
  const project = useOpenProject();
  // A preset keeps the user's further behaviors and own states; it asks before replacing states it cannot merge
  const choose = async (next: string | null) => {
    if (blockBehaviorReplacesStates(block, next, craftEngineItemKey(project, item))) {
      const replace = await confirm({
        title: t('ceBlock.replaceStates.title'),
        message: t('ceBlock.replaceStates.message'),
        confirmLabel: t('ceBlock.replaceStates.confirm'),
        destructive: true,
      });
      if (!replace) return;
      setBlockBehavior(item.id, next, { replaceStates: true });
      return;
    }
    setBlockBehavior(item.id, next);
  };
  const type = blockBehaviorType(block);
  const hasForm = CE_BLOCK_BEHAVIOR_FORMS.some((form) => form.type === type);
  const value = type === null ? NONE : hasForm ? type : OTHER;
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id}>{t('ceBlock.behavior')}</FieldLabel>
      <NativeSelect id={id} className="w-full" value={value} onChange={(e) => void choose(e.target.value === NONE ? null : e.target.value)}>
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

/** The block behavior catalog, as the source of the main behavior's fields */
const BEHAVIOR_SOURCE = { types: () => CE_BLOCK_BEHAVIORS };

/**
 * The main behavior (`block.behavior`) with the fields of its type from the catalog and a link to its wiki page. The
 * behavior select sets the type; an unknown type is edited as YAML.
 */
function MainBehavior({ item, behavior }: { item: Item; behavior: Record<string, unknown> }) {
  const t = useTranslations('item');
  const known = findTypedType(BEHAVIOR_SOURCE, behavior);
  return (
    <SectionCard
      size="sm"
      title={<span className="font-mono">{String(behavior.type ?? '')}</span>}
      description={t('ceBlock.behaviorKeys')}
      actions={
        known?.docs && (
          <IconButton
            label={t('properties.docs.craftengine')}
            nativeButton={false}
            render={<a href={known.docs} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink />
          </IconButton>
        )
      }
    >
      <TypedEntryBody
        source={BEHAVIOR_SOURCE}
        entry={behavior}
        onChange={(next) =>
          updateCraftEngineBlock(
            item.id,
            (block) =>
              ({ ...block, behavior: (toConfigValue(next) as ConfigObject | undefined) ?? { type: behavior.type } }) as ConfigObject,
            'block.behavior',
          )
        }
      />
    </SectionCard>
  );
}

/**
 * CraftEngine: whether the item places a block of its own, its behavior (with the keys of its type, and the open look
 * of a storage block), further behaviors, its states (the vanilla states it borrows, `auto_state`) and the block
 * settings. Shown for CraftEngine projects only (their form has the block settings group).
 * An item is either a block or furniture, so the toggle is off while the item places furniture.
 */
export function CraftEngineBlockSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const block = craftEngineBlock(item.config);
  const isFurniture = craftEngineFurniture(item.config) !== null;
  return (
    <Section title={t('ceBlock.title')} description={t('ceBlock.description')}>
      <CheckboxField
        checked={block !== null}
        disabled={isFurniture && block === null}
        onChange={(checked) => setCraftEngineBlock(item.id, checked)}
        label={t('ceBlock.toggle')}
        description={isFurniture && block === null ? t('ceBlock.toggleBlocked') : t('ceBlock.toggleHelp')}
      />
      {block && (
        <>
          <BehaviorSelect item={item} block={block} />
          {isPlainObject(block.behavior) && <MainBehavior item={item} behavior={block.behavior} />}
          {blockBehaviorType(block) === 'simple_storage_block' && (
            <CheckboxField
              checked={hasStorageOpenLook(block)}
              onChange={(checked) => setBlockStorageOpenLook(item.id, checked)}
              label={t('ceBlock.storageOpenLook')}
              description={t('ceBlock.storageOpenLookHelp')}
            />
          )}
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
