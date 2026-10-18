/**
 * The behaviors of a CraftEngine block (UX §4): every behavior as a typed entry card with all its keys and a link to
 * its wiki page, the main one (set up by a preset together with the states) first. "Add behavior" opens the catalog of
 * all behaviors by category. Only one card is open at a time, so the list stays short.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Wand2 } from 'lucide-react';
import {
  addsBlockBehaviorPreset,
  blockBehaviorEntries,
  blockBehaviorReplacesStates,
  blockBehaviorTypes,
  blockPropertyTypes,
  type BlockBehaviorEntry,
  canPromoteBlockBehavior,
  CE_DOCS,
  blockBehaviorForm,
  craftEngineItemKey,
  hasStorageOpenLook,
  missingBehaviorKeys,
  missingBehaviorProperties,
} from '@resourcepackbuilder/core/craftEngine';
import { type ConfigValue, type Item, toConfigValue } from '@resourcepackbuilder/core/project';
import { DocsLink, EmptyHint, type MenuEntry, Section, StatusPill } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import {
  addBlockBehaviors,
  promoteBlockBehavior,
  removeBlockBehavior,
  setBlockStorageOpenLook,
  updateBlockBehavior,
} from '../../../commands/items';
import { CheckboxField } from '../../../components/CheckboxField';
import { CatalogDialog, TypedEntryCard, useCatalogText } from '../../../components/catalog';
import { confirm } from '../../../store/dialogs';
import { useOpenProject } from '../../../store/project';
import { BLOCK_BEHAVIOR_SOURCE, blockBehaviorCatalog } from './behaviorCatalog';

/** The section's anchor (SectionNav). */
export const BLOCK_BEHAVIORS_SECTION_ID = 'block-behaviors';

/** The key of a card: where the behavior lives and its type. */
const cardKey = (entry: BlockBehaviorEntry) => `${entry.ref.key}:${entry.ref.index}:${entry.type ?? ''}`;
/** What the open card is remembered by: its type (each type is listed once), or its place for an untyped entry. */
const openId = (entry: BlockBehaviorEntry) => entry.type ?? `${entry.ref.key}:${entry.ref.index}`;

/** Scrolls a behavior card into view (after "Jump to" or adding it). */
function revealCard(type: string) {
  requestAnimationFrame(() =>
    document.querySelector(`[data-slot="typed-entry-card"][data-type="${CSS.escape(type)}"]`)?.scrollIntoView({ block: 'nearest' }),
  );
}

/** What a behavior lacks: the keys it cannot do without and the state properties it needs. */
function behaviorProblems(block: Record<string, unknown>, entry: unknown) {
  const alone = { ...block, behavior: entry, behaviors: undefined };
  return {
    keys: missingBehaviorKeys(alone).map((missing) => missing.key),
    properties: missingBehaviorProperties(alone, blockPropertyTypes(block)).map((missing) => missing.property),
  };
}

export function BehaviorsSection({ item, block }: { item: Item; block: Record<string, unknown> }) {
  const t = useTranslations('item');
  const text = useCatalogText();
  const project = useOpenProject();
  const itemKey = craftEngineItemKey(project, item);
  const [isPicking, setPicking] = useState(false);
  // The open card, for the item it was opened on (the editor stays mounted when another item opens)
  const [opened, setOpened] = useState<{ itemId: string; id: string } | null>(null);
  const openedId = opened?.itemId === item.id ? opened.id : null;
  const entries = blockBehaviorEntries(block);
  const types = blockBehaviorTypes(block);

  const openType = (type: string) => {
    setOpened({ itemId: item.id, id: type });
    revealCard(type);
  };

  // A preset that would replace the user's own states asks first (as picking a preset always did)
  const askReplace = async (type: string) =>
    !blockBehaviorReplacesStates(block, type, itemKey) ||
    (await confirm({
      title: t('ceBlock.replaceStates.title'),
      message: t('ceBlock.replaceStates.message'),
      confirmLabel: t('ceBlock.replaceStates.confirm'),
      destructive: true,
    }));

  const add = async (ids: string[]) => {
    const presetType = ids.find((id) => addsBlockBehaviorPreset(block, id));
    if (presetType && blockBehaviorReplacesStates(block, presetType, itemKey)) {
      if (!(await askReplace(presetType))) return;
      addBlockBehaviors(item.id, ids, { replaceStates: true });
    } else addBlockBehaviors(item.id, ids);
    // The card of the last new behavior opens
    const last = ids.at(-1);
    if (last) openType(last);
  };

  const promote = async (entry: BlockBehaviorEntry) => {
    if (!entry.type) return;
    if (blockBehaviorReplacesStates(block, entry.type, itemKey)) {
      if (!(await askReplace(entry.type))) return;
      promoteBlockBehavior(item.id, entry.ref, { replaceStates: true });
    } else promoteBlockBehavior(item.id, entry.ref);
  };

  // The editor's name of a behavior it has a preset for; behavior ids come from core at runtime, and a test checks
  // each preset has a name in en and de
  const presetName = (type: string | undefined) => (type && blockBehaviorForm(type) ? t(`ceBlock.behaviors.${type}` as never) : undefined);
  const catalog = blockBehaviorCatalog(
    {
      text,
      block,
      itemKey,
      presetName,
      presetNote: t('block.behaviors.presetNote'),
    },
    types,
  );

  return (
    <Section
      id={BLOCK_BEHAVIORS_SECTION_ID}
      title={t('block.behaviors.title')}
      description={t('block.behaviors.description')}
      meta={
        <>
          {entries.length > 0 && <StatusPill tone="muted" label={String(entries.length)} />}
          <DocsLink url={CE_DOCS.blockBehaviors} target="craftengine" label={t('block.behaviors.title')} />
        </>
      }
      actions={
        <Button size="sm" variant="outline" onClick={() => setPicking(true)} data-testid="block-add-behavior">
          <Plus /> {t('block.behaviors.add')}
        </Button>
      }
    >
      {entries.length === 0 ? (
        <EmptyHint actionLabel={t('block.behaviors.add')} onAction={() => setPicking(true)}>
          {t('block.behaviors.empty')}
        </EmptyHint>
      ) : (
        <div className="flex flex-col gap-2" data-slot="block-behaviors">
          {entries.map((entry) => {
            const key = cardKey(entry);
            const isOpen = openedId === openId(entry);
            const problems = behaviorProblems(block, entry.entry);
            const promotable =
              !entry.main && entry.ref.key === 'behaviors' && !!blockBehaviorForm(entry.type) && canPromoteBlockBehavior(block);
            const menu: MenuEntry[] = promotable
              ? [{ icon: <Wand2 />, label: t('block.behaviors.setUp'), onSelect: () => void promote(entry) }]
              : [];
            return (
              <TypedEntryCard
                key={key}
                source={BLOCK_BEHAVIOR_SOURCE}
                entry={entry.entry}
                label={presetName(entry.type)}
                open={isOpen}
                onOpenChange={(open) => setOpened(open ? { itemId: item.id, id: openId(entry) } : null)}
                onChange={(next) => updateBlockBehavior(item.id, entry.ref, (toConfigValue(next) ?? {}) as ConfigValue, `behavior-${key}`)}
                onRemove={() => removeBlockBehavior(item.id, entry.ref)}
                menu={menu}
                badges={
                  <>
                    {entry.main && <StatusPill tone="muted" label={t('block.behaviors.main')} />}
                    {problems.keys.length > 0 && (
                      <StatusPill tone="error" label={t('block.behaviors.missingKeys', { keys: problems.keys.join(', ') })} />
                    )}
                    {problems.properties.length > 0 && (
                      <StatusPill
                        tone="warning"
                        label={t('block.behaviors.missingProperties', { names: problems.properties.join(', ') })}
                      />
                    )}
                  </>
                }
              >
                {entry.type === 'simple_storage_block' && (
                  <CheckboxField
                    checked={hasStorageOpenLook(block)}
                    onChange={(checked) => setBlockStorageOpenLook(item.id, checked)}
                    label={t('ceBlock.storageOpenLook')}
                    description={t('ceBlock.storageOpenLookHelp')}
                  />
                )}
              </TypedEntryCard>
            );
          })}
        </div>
      )}
      <CatalogDialog
        open={isPicking}
        onOpenChange={setPicking}
        title={t('block.behaviors.dialogTitle')}
        description={t('block.behaviors.dialogDescription')}
        searchPlaceholder={t('block.behaviors.search')}
        items={catalog.items}
        categories={catalog.categories}
        addLabel={t('block.behaviors.add')}
        onAdd={(ids) => void add(ids)}
        onJumpTo={openType}
      />
    </Section>
  );
}
