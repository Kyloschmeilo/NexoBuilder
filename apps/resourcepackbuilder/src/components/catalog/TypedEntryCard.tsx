/**
 * One entry of a typed list (a CraftEngine block behavior, a condition, a function, a loot entry …) as a card (UX §3.5).
 * The header shows the type's icon, its human name, the type id in the key rail, the docs link, a Premium pill, a
 * "Negate" switch for invertible types and the `⋯` menu; the body shows the type's fields (advanced ones under "More
 * options"). A type the catalog does not know (written by hand, or newer than the app) gets the same card with a YAML
 * editor as its body, so no entry is a dead end. The body collapses to a one-line summary of the set keys.
 */
import { type ReactNode, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Copy, Ellipsis, FileCode2, Trash2 } from 'lucide-react';
import { cn } from '@resourcepackbuilder/ui/cn';
import { findTypedType, type ObjectField, type TypedType, type YamlField } from '@resourcepackbuilder/core/form';
import { toYaml } from '@resourcepackbuilder/core/yaml';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { DocsLink, MenuEntries, type MenuEntry, StatusPill, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { Switch } from '@resourcepackbuilder/ui/components/switch';
import { ObjectFields } from '../editor/editors/ObjectEditor';
import { YamlEditor } from '../editor/editors/YamlEditor';
import { typeParts } from '../editor/values';
import { featureSummary } from '../features/featureSummary';
import { useFormTarget } from '../formTarget';
import { useSchemaText } from '../useSchemaText';
import { typedTypeLabel } from './adapters';
import { categoryIcon } from './categoryIcons';

/** What a typed entry card needs from its list: the types, and whether a leading "!" inverts an entry. */
export interface TypedSource {
  types: () => readonly TypedType[];
  invertible?: boolean;
}

export interface TypedEntryCardProps {
  source: TypedSource;
  /** The entry as it is in the YAML (`{ type: slab_block, … }`); anything else is shown as YAML. */
  entry: unknown;
  onChange: (entry: unknown) => void;
  /** Adds "Remove" to the menu. */
  onRemove?: () => void;
  /** Further menu entries before Copy YAML and Remove (e.g. Duplicate). */
  menu?: MenuEntry[];
  /** Collapsible body: controlled with `open`, or uncontrolled from `defaultOpen` (open by default). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * The header opens the entry elsewhere (a dialog for deeply nested entries) instead of expanding the body: the
   * toggle announces a dialog, and `onOpenChange(true)` asks the caller to open it.
   */
  opensDialog?: boolean;
  /** Whether the header collapses the body; a card that is always open (e.g. alone in a dialog) has a plain header. */
  collapsible?: boolean;
  /** What "Copy YAML" copies (as a one-entry list), when the YAML entry differs from `entry`; `entry` by default. */
  yamlEntry?: unknown;
  /** Content after the fields, such as the nested lists of an event (two `SubSection`s). */
  children?: ReactNode;
  className?: string;
}

const ENTRY_YAML: YamlField = { type: 'yaml', key: '', label: '' };

/** A typed entry as a card with its type's form, or a YAML body for an unknown type. */
export function TypedEntryCard({
  source,
  entry,
  onChange,
  onRemove,
  menu = [],
  open,
  defaultOpen = true,
  onOpenChange,
  opensDialog = false,
  collapsible = true,
  yamlEntry = entry,
  children,
  className,
}: TypedEntryCardProps) {
  const t = useTranslations('editor.typedEntry');
  const tFeature = useTranslations('editor.feature');
  const tCatalog = useTranslations('editor.catalog');
  const text = useSchemaText();
  const target = useFormTarget();
  const bodyId = useId();
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const isOpen = !opensDialog && (!collapsible || (open ?? ownOpen));
  const record = isPlainObject(entry) ? entry : {};
  const { name, inverted } = typeParts(record.type, source.invertible);
  const type = findTypedType(source, entry);
  const label = type ? typedTypeLabel(type, { schema: text }) : name || t('noType');
  const description = type?.help ? text(type.help) : undefined;
  const settings = Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'type'));
  const objectField: ObjectField | undefined = type && { type: 'object', key: '', label: '', fields: type.fields };
  const summary = objectField
    ? featureSummary(objectField, settings, {
        on: tFeature('on'),
        off: tFeature('off'),
        notSet: t('noSettings'),
        entries: (count) => tFeature('entries', { count }),
        option: (key) => text(key),
      })
    : t('unknownSummary');

  const toggle = () => {
    if (opensDialog) {
      onOpenChange?.(true);
      return;
    }
    setOwnOpen(!isOpen);
    onOpenChange?.(!isOpen);
  };
  const setInverted = (next: boolean) => onChange({ ...record, type: next ? `!${name}` : name });
  const entries: MenuEntry[] = [
    ...menu,
    { icon: <Copy />, label: tFeature('copyYaml'), onSelect: () => void navigator.clipboard?.writeText(toYaml([yamlEntry])) },
    ...(onRemove
      ? (['separator', { icon: <Trash2 />, label: tFeature('remove'), destructive: true, onSelect: onRemove }] as MenuEntry[])
      : []),
  ];

  const heading = (
    <>
      <span
        aria-hidden
        className={cn(
          'grid size-6.5 flex-none place-items-center rounded-md [&_svg]:size-3.5',
          type ? 'bg-accent-soft text-primary' : 'bg-surface-sunken text-text-muted',
        )}
      >
        {type ? categoryIcon(type.category) : <FileCode2 />}
      </span>
      <span className="truncate text-label font-semibold text-text">{label}</span>
      {!isOpen && <span className="min-w-0 flex-1 truncate text-meta text-text-muted">{summary}</span>}
    </>
  );

  return (
    <div
      data-slot="typed-entry-card"
      data-type={name || undefined}
      data-known={!!type || undefined}
      className={cn('@container/entry min-w-0 rounded-xl border border-line bg-surface', className)}
    >
      <div className={cn('flex min-h-11 items-center gap-2 px-2', isOpen && 'border-b border-line')}>
        {collapsible ? (
          <button
            type="button"
            data-slot="entry-toggle"
            aria-expanded={opensDialog ? undefined : isOpen}
            aria-haspopup={opensDialog ? 'dialog' : undefined}
            aria-controls={opensDialog ? undefined : bodyId}
            onClick={toggle}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 self-stretch rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className={cn('size-4 flex-none text-text-muted transition-transform', isOpen && 'rotate-90')} aria-hidden />
            {heading}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 self-stretch pl-1">{heading}</div>
        )}
        {source.invertible && name && (
          <Tip label={t('negateHint')}>
            <label className="flex flex-none items-center gap-1.5 text-meta text-text-muted">
              <Switch size="sm" checked={inverted} onCheckedChange={setInverted} />
              {t('negate')}
            </label>
          </Tip>
        )}
        {type?.premium && <StatusPill tone="info" label={tCatalog('premium')} />}
        {name && (
          <code data-slot="yaml-key" className="hidden max-w-56 flex-none truncate font-mono text-micro text-text-faint @lg/entry:block">
            {inverted ? `!${name}` : name}
          </code>
        )}
        {type?.docs && target && <DocsLink url={type.docs} target={target} label={label} />}
        <DropdownMenu>
          <Tip label={tFeature('actions', { name: label })}>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={tFeature('actions', { name: label })} />}>
              <Ellipsis />
            </DropdownMenuTrigger>
          </Tip>
          <DropdownMenuContent align="end" className="w-auto min-w-44">
            <MenuEntries entries={entries} kind="dropdown" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div id={bodyId} hidden={!isOpen} className="flex flex-col gap-3 p-3">
        {isOpen && (
          <>
            {type ? (
              <>
                {description && <p className="text-meta text-text-muted">{description}</p>}
                {objectField && objectField.fields.length > 0 ? (
                  <ObjectFields field={objectField} value={entry} onChange={onChange} />
                ) : (
                  <p className="text-meta text-text-muted">{t('noFields')}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-meta text-text-muted" data-slot="unknown-type-note">
                  {t('unknown')}
                </p>
                <YamlEditor field={ENTRY_YAML} value={entry} onChange={(next) => onChange(next ?? {})} hideLabel />
              </>
            )}
            {children}
          </>
        )}
      </div>
    </div>
  );
}
