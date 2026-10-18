/**
 * The behaviors of a CraftEngine block (UX §4): a compact card per behavior (its icon, name, type id, the keys it
 * sets, the wiki link, problems and the `⋯` menu), the main one (set up by a preset together with the states) first.
 * Clicking a card, or Enter on it, opens the behavior in an edit dialog with all its keys, its wiki link, "Remove" and
 * "Done"; focus returns to the card when the dialog closes. "Add behavior" opens the catalog of all behaviors by
 * category, and a behavior added there opens its dialog right away.
 */
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, Ellipsis, FileCode2, Plus, Trash2, TriangleAlert, Wand2 } from 'lucide-react';
import {
  addsBlockBehaviorPreset,
  blockBehaviorEntries,
  type BlockBehaviorEntry,
  blockBehaviorForm,
  blockBehaviorReplacesStates,
  blockBehaviorTypes,
  blockPropertyTypes,
  canPromoteBlockBehavior,
  CE_DOCS,
  craftEngineItemKey,
  hasStorageOpenLook,
  missingBehaviorKeys,
  missingBehaviorProperties,
} from '@resourcepackbuilder/core/craftEngine';
import { findTypedType, type ObjectField, type YamlField } from '@resourcepackbuilder/core/form';
import { type ConfigValue, type Item, toConfigValue } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { DocsLink, EmptyHint, MenuEntries, type MenuEntry, Section, StatusPill, Tip } from '@resourcepackbuilder/ui';
import { cn } from '@resourcepackbuilder/ui/cn';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import {
  addBlockBehaviors,
  promoteBlockBehavior,
  removeBlockBehavior,
  setBlockStorageOpenLook,
  updateBlockBehavior,
} from '../../../commands/items';
import { CheckboxField } from '../../../components/CheckboxField';
import { CatalogDialog, categoryIcon, typedTypeLabel, useCatalogText } from '../../../components/catalog';
import { ObjectFields } from '../../../components/editor/editors/ObjectEditor';
import { YamlEditor } from '../../../components/editor/editors/YamlEditor';
import { featureSummary } from '../../../components/features';
import { useSchemaText } from '../../../components/useSchemaText';
import { confirm } from '../../../store/dialogs';
import { useOpenProject } from '../../../store/project';
import { BLOCK_BEHAVIOR_SOURCE, blockBehaviorCatalog } from './behaviorCatalog';
import { DetailDialog } from './DetailDialog';

/** The section's anchor (SectionNav). */
export const BLOCK_BEHAVIORS_SECTION_ID = 'block-behaviors';

const ENTRY_YAML: YamlField = { type: 'yaml', key: '', label: '' };

/** Where a behavior lives, as one string (cards and the open dialog are keyed by it, so two entries of one type differ). */
const refKey = (entry: BlockBehaviorEntry) => `${entry.ref.key}:${entry.ref.index}`;

/** The dialog to show: a behavior by its place (a clicked card) or by its type (just added, or "Jump to"). */
type Opened = { itemId: string; ref: string } | { itemId: string; type: string };

/** What a behavior lacks: the keys it cannot do without and the state properties it needs. */
function behaviorProblems(block: Record<string, unknown>, entry: unknown) {
  const alone = { ...block, behavior: entry, behaviors: undefined };
  return {
    keys: missingBehaviorKeys(alone).map((missing) => missing.key),
    properties: missingBehaviorProperties(alone, blockPropertyTypes(block)).map((missing) => missing.property),
  };
}

type Problems = ReturnType<typeof behaviorProblems>;

/** The problems of a behavior as sentences, the missing keys (errors) first. */
function useProblemTexts(problems: Problems): { tone: 'error' | 'warning'; message: string }[] {
  const t = useTranslations('item');
  return [
    ...(problems.keys.length > 0
      ? [{ tone: 'error' as const, message: t('block.behaviors.missingKeys', { keys: problems.keys.join(', ') }) }]
      : []),
    ...(problems.properties.length > 0
      ? [{ tone: 'warning' as const, message: t('block.behaviors.missingProperties', { names: problems.properties.join(', ') }) }]
      : []),
  ];
}

/** Name, type, docs link and summary of a behavior entry, from the catalog (or a readable form of an unknown type). */
function useBehaviorInfo(entry: BlockBehaviorEntry, presetName: (type: string | undefined) => string | undefined) {
  const t = useTranslations('editor.typedEntry');
  const tFeature = useTranslations('editor.feature');
  const text = useSchemaText();
  const type = findTypedType(BLOCK_BEHAVIOR_SOURCE, entry.entry);
  const record = isPlainObject(entry.entry) ? entry.entry : {};
  const label = presetName(entry.type) ?? (type ? typedTypeLabel(type, { schema: text }) : entry.type || t('noType'));
  const settings = Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'type'));
  const field: ObjectField | undefined = type && { type: 'object', key: '', label: '', fields: type.fields };
  const summary = field
    ? featureSummary(field, settings, {
        on: tFeature('on'),
        off: tFeature('off'),
        notSet: t('noSettings'),
        entries: (count) => tFeature('entries', { count }),
        option: (key) => text(key),
      })
    : t('unknownSummary');
  return { type, field, label, summary, description: type?.help ? text(type.help) : undefined };
}

/** One behavior in the list: opens its dialog on click or Enter; the docs link and the menu sit beside it. */
function BehaviorCard({
  entry,
  problems,
  menu,
  presetName,
  onOpen,
  buttonRef,
}: {
  entry: BlockBehaviorEntry;
  problems: Problems;
  menu: MenuEntry[];
  presetName: (type: string | undefined) => string | undefined;
  onOpen: () => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
}) {
  const t = useTranslations('item');
  const tFeature = useTranslations('editor.feature');
  const { type, label, summary } = useBehaviorInfo(entry, presetName);
  const issues = useProblemTexts(problems);
  const issue = issues[0];
  const IssueIcon = issue?.tone === 'error' ? CircleAlert : TriangleAlert;
  return (
    <div
      data-slot="behavior-card"
      data-type={entry.type}
      className="group/card relative flex min-w-0 items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 transition-colors hover:border-primary/60 has-[[data-slot=behavior-open]:focus-visible]:border-primary"
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-6.5 flex-none place-items-center rounded-md [&_svg]:size-3.5',
          type ? 'bg-accent-soft text-primary' : 'bg-surface-sunken text-text-muted',
        )}
      >
        {type ? categoryIcon(type.category) : <FileCode2 />}
      </span>
      <button
        ref={buttonRef}
        type="button"
        data-slot="behavior-open"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 text-left outline-none after:absolute after:inset-0 after:rounded-lg"
      >
        <span className="flex max-w-full items-center gap-1.5">
          <span className="truncate text-label font-semibold text-text">{label}</span>
          {entry.main && <StatusPill tone="muted" label={t('block.behaviors.main')} />}
        </span>
        <code className="max-w-full truncate font-mono text-micro text-text-faint">{entry.type ?? ''}</code>
        <span className="max-w-full truncate font-mono text-meta text-text-muted">{summary}</span>
      </button>
      <div className="relative z-10 flex flex-none items-center gap-0.5">
        {issue && (
          <Tip label={issues.map((i) => i.message).join(' ')}>
            <span
              role="img"
              aria-label={issues.map((i) => i.message).join(' ')}
              className={cn('grid size-6 place-items-center [&_svg]:size-4', issue.tone === 'error' ? 'text-danger' : 'text-warning')}
            >
              <IssueIcon />
            </span>
          </Tip>
        )}
        {type?.docs && <DocsLink url={type.docs} target="craftengine" label={label} />}
        <DropdownMenu>
          <Tip label={tFeature('actions', { name: label })}>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={tFeature('actions', { name: label })} />}>
              <Ellipsis />
            </DropdownMenuTrigger>
          </Tip>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <MenuEntries entries={menu} kind="dropdown" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** The edit dialog of one behavior: its help, all its keys (rare ones under More options), Remove and Done. */
function BehaviorDialog({
  item,
  block,
  entry,
  presetName,
  onClose,
}: {
  item: Item;
  block: Record<string, unknown>;
  entry: BlockBehaviorEntry;
  presetName: (type: string | undefined) => string | undefined;
  onClose: () => void;
}) {
  const t = useTranslations('item');
  const tTyped = useTranslations('editor.typedEntry');
  const { type, field, label, description } = useBehaviorInfo(entry, presetName);
  const issues = useProblemTexts(behaviorProblems(block, entry.entry));
  const change = (next: unknown) =>
    updateBlockBehavior(item.id, entry.ref, (toConfigValue(next) ?? {}) as ConfigValue, `behavior-${refKey(entry)}`);
  return (
    <DetailDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={
        <span className="flex min-w-0 items-center gap-2" data-slot="behavior-dialog-title">
          <span className="truncate">{t('block.behaviors.editTitle', { name: label })}</span>
          {type?.docs && <DocsLink url={type.docs} target="craftengine" label={label} />}
        </span>
      }
      description={
        <>
          <code className="font-mono">type: {entry.type ?? ''}</code>
          {description && ` · ${description}`}
        </>
      }
      footerStart={
        <Button
          variant="ghost-destructive"
          size="sm"
          onClick={() => {
            onClose();
            removeBlockBehavior(item.id, entry.ref);
          }}
        >
          <Trash2 /> {t('block.behaviors.remove')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3" data-slot="behavior-dialog">
        {issues.map((issue) => (
          <p key={issue.message} className={cn('m-0 text-meta', issue.tone === 'error' ? 'text-danger' : 'text-warning')}>
            {issue.message}
          </p>
        ))}
        {type && field ? (
          field.fields.length > 0 ? (
            <ObjectFields field={field} value={entry.entry} onChange={change} />
          ) : (
            <p className="m-0 text-meta text-text-muted">{tTyped('noFields')}</p>
          )
        ) : (
          <>
            <p className="m-0 text-meta text-text-muted">{tTyped('unknown')}</p>
            <YamlEditor field={ENTRY_YAML} value={entry.entry} onChange={(next) => change(next ?? {})} hideLabel />
          </>
        )}
        {entry.type === 'simple_storage_block' && (
          <CheckboxField
            checked={hasStorageOpenLook(block)}
            onChange={(checked) => setBlockStorageOpenLook(item.id, checked)}
            label={t('ceBlock.storageOpenLook')}
            description={t('ceBlock.storageOpenLookHelp')}
          />
        )}
      </div>
    </DetailDialog>
  );
}

export function BehaviorsSection({ item, block }: { item: Item; block: Record<string, unknown> }) {
  const t = useTranslations('item');
  const tFeature = useTranslations('editor.feature');
  const text = useCatalogText();
  const project = useOpenProject();
  const itemKey = craftEngineItemKey(project, item);
  const [isPicking, setPicking] = useState(false);
  // The open dialog, for the item it was opened on (the editor stays mounted when another item opens)
  const [opened, setOpened] = useState<Opened | null>(null);
  const cardButtons = useRef(new Map<string, HTMLButtonElement>());
  const entries = blockBehaviorEntries(block);
  const types = blockBehaviorTypes(block);
  const openEntry =
    opened?.itemId === item.id
      ? entries.find((entry) => ('ref' in opened ? refKey(entry) === opened.ref : entry.type === opened.type))
      : undefined;

  const close = () => {
    const key = openEntry && refKey(openEntry);
    setOpened(null);
    // Back to the card the dialog belongs to, once the dialog has let go of the focus
    if (key) setTimeout(() => cardButtons.current.get(key)?.focus(), 0);
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
    // The last new behavior opens in its dialog
    const last = ids.at(-1);
    if (last) setOpened({ itemId: item.id, type: last });
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
  const catalog = blockBehaviorCatalog({ text, block, itemKey, presetName, presetNote: t('block.behaviors.presetNote') }, types);

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
        <div className="@container/behaviors">
          <div className="grid gap-2 @2xl/behaviors:grid-cols-2" data-slot="block-behaviors">
            {entries.map((entry) => {
              const key = refKey(entry);
              const promotable =
                !entry.main && entry.ref.key === 'behaviors' && !!blockBehaviorForm(entry.type) && canPromoteBlockBehavior(block);
              const menu: MenuEntry[] = [
                ...(promotable ? [{ icon: <Wand2 />, label: t('block.behaviors.setUp'), onSelect: () => void promote(entry) }] : []),
                ...(promotable ? (['separator'] as MenuEntry[]) : []),
                { icon: <Trash2 />, label: tFeature('remove'), destructive: true, onSelect: () => removeBlockBehavior(item.id, entry.ref) },
              ];
              return (
                <BehaviorCard
                  key={`${key}:${entry.type ?? ''}`}
                  entry={entry}
                  problems={behaviorProblems(block, entry.entry)}
                  menu={menu}
                  presetName={presetName}
                  onOpen={() => setOpened({ itemId: item.id, ref: key })}
                  buttonRef={(element) => {
                    if (element) cardButtons.current.set(key, element);
                    else cardButtons.current.delete(key);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
      {openEntry && <BehaviorDialog item={item} block={block} entry={openEntry} presetName={presetName} onClose={close} />}
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
        onJumpTo={(type) => setOpened({ itemId: item.id, type })}
      />
    </Section>
  );
}
