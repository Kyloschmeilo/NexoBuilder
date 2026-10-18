/**
 * Lists of objects switched by their type (CraftEngine conditions, functions, loot entries, behaviors, updater steps;
 * events switched by their trigger) as `TypedEntryCard`s with an "Add …" button that opens the catalog of the list's
 * types. Only the entry being edited is expanded; the others show a one-line summary. Lists nested inside two typed
 * entries no longer expand in place: their entries open in a dialog whose title is the breadcrumb of the entries
 * around it ("Event: Right click › Function: Run › Condition: Permission"), so the page never indents deeper.
 *
 * Also the older building blocks of a typed entry (`TypeInput`, `TypedEntryBody`), which other editors still use.
 */
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Copy, ExternalLink, Plus, Replace } from 'lucide-react';
import {
  findTypedType,
  type ObjectField,
  type ObjectListField,
  type TypedListField,
  type TypedType,
  type YamlField,
} from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { IconButton, type MenuEntry, MenuEntries, Tip, useRowKeys, useUiLabels } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Dialog, DialogClose } from '@resourcepackbuilder/ui/components/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { FieldDescription } from '@resourcepackbuilder/ui/components/field';
import { catalogFromTypedSource, typedTypeLabel } from '../../catalog/adapters';
import { CatalogDialog } from '../../catalog/CatalogDialog';
import { categoryIcon } from '../../catalog/categoryIcons';
import { TypedEntryCard } from '../../catalog/TypedEntryCard';
import { useCatalogText } from '../../catalog/useCatalogText';
import { DialogFrame } from '../../DialogFrame';
import { useFormTarget } from '../../formTarget';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import type { LiteralChoice } from '../inputs/choices';
import { TextInput } from '../inputs/TextInput';
import type { EditorProps } from '../types';
import { listOrUndefined, typeParts, withEntryType } from '../values';
import { ObjectFields } from './ObjectEditor';
import { YamlEditor } from './YamlEditor';

/** What the typed entry editors need from a typed list or number provider field. */
export interface TypedSource {
  types: () => readonly TypedType[];
  invertible?: boolean;
}

const ENTRY_YAML: YamlField = { type: 'yaml', key: '', label: '' };

// Nesting ---------------------------------------------------------------------------------------------------------

/** How deep a list sits inside typed entries, and the breadcrumb of those entries ("Event: Right click", …). */
export interface TypedNesting {
  depth: number;
  trail: readonly string[];
}

/** Lists inside this many typed entries open their entries in a dialog instead of expanding them in place. */
export const MAX_INLINE_DEPTH = 2;

const TypedNestingContext = createContext<TypedNesting>({ depth: 0, trail: [] });

/** The nesting of the typed list being rendered. */
export function useTypedNesting(): TypedNesting {
  return useContext(TypedNestingContext);
}

/** Sets the nesting for the typed lists below (a typed entry adds one level and its breadcrumb). */
export function TypedNestingProvider({ value, children }: { value: TypedNesting; children: ReactNode }) {
  return <TypedNestingContext.Provider value={value}>{children}</TypedNestingContext.Provider>;
}

/** Whether a list at `depth` opens its entries in a dialog. */
export function opensInDialog(depth: number): boolean {
  return depth >= MAX_INLINE_DEPTH;
}

// Copy ------------------------------------------------------------------------------------------------------------

/** The texts of a typed list: its add button, the title of its catalog and the noun of one entry (breadcrumbs). */
export interface TypedListCopy {
  add: string;
  title: string;
  noun: string;
}

/** The texts for the list of a catalog (`editor.typedList.catalogs.<catalog>`), the generic ones for other catalogs. */
export function useTypedListCopy(catalog: string | undefined): TypedListCopy {
  const t = useTranslations('editor.typedList');
  // Catalog names come from core data at runtime, so the keys cannot be typed as literals
  const scope = catalog && t.has(`catalogs.${catalog}.add` as never) ? `catalogs.${catalog}` : 'default';
  return {
    add: t(`${scope}.add` as never),
    title: t(`${scope}.title` as never),
    noun: t(`${scope}.noun` as never),
  };
}

// Entries keyed by another name than `type` ---------------------------------------------------------------------

/** An entry in the shape the cards read: its type under `type` (for lists that keep it under `typeKey`). */
export function toCardEntry(entry: unknown, typeKey: string): unknown {
  if (typeKey === 'type' || !isPlainObject(entry)) return entry;
  const { [typeKey]: name, ...rest } = entry;
  return name === undefined ? rest : { type: name, ...rest };
}

/** A card's entry back in the list's shape: its type under `typeKey`, first. */
export function fromCardEntry(entry: unknown, typeKey: string): unknown {
  if (typeKey === 'type' || !isPlainObject(entry)) return entry;
  const { type, ...rest } = entry;
  return type === undefined ? rest : { [typeKey]: type, ...rest };
}

/** The type name of an entry (without a leading "!"), empty without one. */
export function entryTypeName(entry: unknown, invertible?: boolean): string {
  return typeParts(isPlainObject(entry) ? entry.type : undefined, invertible).name;
}

// The list --------------------------------------------------------------------------------------------------------

export interface TypedEntryListProps {
  /** The types an entry can have (and whether a leading "!" inverts one). */
  source: TypedSource;
  /** Name of the catalog: picks the texts (`editor.typedList.catalogs.<catalog>`). */
  catalog?: string;
  items: readonly unknown[];
  onChange: (items: unknown[]) => void;
  /** The types offered by "Add …"; all of `source` by default. */
  pickerTypes?: () => readonly TypedType[];
  /** A type may be in the list once: the catalog marks the used ones "Added" and jumps to them. */
  unique?: boolean;
  /** The key that holds an entry's type (`on` for events); `type` by default. */
  typeKey?: string;
  /** The entry a picked type adds (in the list's shape); `{ [typeKey]: type }` by default. */
  newEntry?: (type: string) => unknown;
  /** Content of an entry's card after its fields. */
  renderExtra?: (entry: unknown, onChange: (entry: unknown) => void, index: number) => ReactNode;
  /** Accessible name of the list. */
  'aria-label'?: string;
}

/** Catalogs with no more types than this are offered in a menu instead of the catalog dialog. */
const MENU_MAX_TYPES = 4;

/** How an entry's card is shown: expanding in place, as a row that opens a dialog, or open inside that dialog. */
type CardMode = 'inline' | 'row' | 'dialog';

/**
 * A list of typed entries as cards, with "Add …" (a menu for small catalogs, the `CatalogDialog` otherwise). Cards
 * move, duplicate and remove through their `⋯` menu. One card is expanded at a time; in lists nested two typed entries
 * deep, a card opens its entry in a dialog instead.
 */
export function TypedEntryList({
  source,
  catalog,
  items,
  onChange,
  pickerTypes,
  unique = false,
  typeKey = 'type',
  newEntry,
  renderExtra,
  ...props
}: TypedEntryListProps) {
  const t = useTranslations('editor.typedList');
  const labels = useUiLabels();
  const text = useSchemaText();
  const catalogText = useCatalogText();
  const target = useFormTarget() ?? 'craftengine';
  const copy = useTypedListCopy(catalog);
  const { depth, trail } = useTypedNesting();
  const inDialog = opensInDialog(depth);
  const rows = useRowKeys(items.length);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [dialogKey, setDialogKey] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** The entry whose type "Change type" is picking, by its row key */
  const [retypeKey, setRetypeKey] = useState<string | null>(null);

  const offered = pickerTypes ?? source.types;
  const offeredTypes = offered();
  const cardEntries = items.map((entry) => toCardEntry(entry, typeKey));
  const used = cardEntries.map((entry) => entryTypeName(entry, source.invertible)).filter(Boolean);
  const catalogData = catalogFromTypedSource({ types: offered }, { text: catalogText, target, ...(unique && { added: used }) });

  const labelOf = (entry: unknown): string => {
    const type = findTypedType(source, entry);
    return type ? typedTypeLabel(type, { schema: text }) : entryTypeName(entry, source.invertible) || copy.noun;
  };
  const crumbOf = (entry: unknown) => t('crumb', { noun: copy.noun, label: labelOf(entry) });

  const replace = (index: number, next: unknown) => onChange(items.map((entry, i) => (i === index ? next : entry)));
  const remove = (index: number) => {
    rows.remove(index);
    onChange(items.filter((_, i) => i !== index));
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    rows.move(from, to);
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const duplicate = (index: number) => {
    const key = rows.insert(index + 1);
    onChange([...items.slice(0, index + 1), structuredClone(items[index]), ...items.slice(index + 1)]);
    setOpenKey(key);
  };
  const open = (key: string) => (inDialog ? setDialogKey(key) : setOpenKey(key));
  const add = (types: string[]) => {
    if (types.length === 0) return;
    const next = [...items];
    let lastKey = '';
    for (const type of types) {
      lastKey = rows.insert(next.length);
      next.push(newEntry?.(type) ?? fromCardEntry({ type }, typeKey));
    }
    onChange(next);
    // The new entry opens when it has anything to fill in
    const last = offeredTypes.find((type) => type.type === types[types.length - 1]);
    if (last && last.fields.length > 0) open(lastKey);
  };
  const jumpTo = (type: string) => {
    const index = cardEntries.findIndex((entry) => entryTypeName(entry, source.invertible) === type);
    if (index < 0) return;
    const key = rows.keys[index];
    open(key);
    requestAnimationFrame(() => document.querySelector(`[data-row-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'center' }));
  };

  /** Gives entry `index` another type: the keys the new type has too stay, a "!" stays. */
  const retype = (index: number, type: string) => {
    const entry = cardEntries[index];
    const record = isPlainObject(entry) ? entry : {};
    const { inverted } = typeParts(record.type, source.invertible);
    const known = source.types().find((candidate) => candidate.type === type);
    replace(index, fromCardEntry(withEntryType(record, inverted ? `!${type}` : type, known), typeKey));
  };
  const retypeIndex = retypeKey === null ? -1 : rows.keys.indexOf(retypeKey);

  const menuFor = (index: number): MenuEntry[] => [
    {
      icon: <Replace />,
      label: catalog === 'triggers' ? t('changeTrigger') : t('changeType'),
      onSelect: () => setRetypeKey(rows.keys[index]),
    },
    { icon: <Copy />, label: labels.duplicate, onSelect: () => duplicate(index) },
    ...(items.length > 1
      ? [
          { icon: <ArrowUp />, label: labels.moveUp, disabled: index === 0, onSelect: () => move(index, index - 1) },
          {
            icon: <ArrowDown />,
            label: labels.moveDown,
            disabled: index === items.length - 1,
            onSelect: () => move(index, index + 1),
          },
        ]
      : []),
  ];

  /** The card of entry `index`; the lists inside it sit one level deeper, under its breadcrumb. */
  const card = (index: number, mode: CardMode) => {
    const key = rows.keys[index];
    const entry = cardEntries[index];
    return (
      <TypedNestingProvider value={{ depth: mode === 'dialog' ? 1 : depth + 1, trail: [...trail, crumbOf(entry)] }}>
        <TypedEntryCard
          source={source}
          entry={entry}
          yamlEntry={items[index]}
          onChange={(next) => replace(index, fromCardEntry(next, typeKey))}
          onRemove={() => {
            if (mode === 'dialog') setDialogKey(null);
            remove(index);
          }}
          menu={mode === 'dialog' ? [] : menuFor(index)}
          opensDialog={mode === 'row'}
          collapsible={mode !== 'dialog'}
          open={mode === 'dialog' || (mode === 'inline' && openKey === key)}
          onOpenChange={(isOpen) => {
            if (mode === 'row') setDialogKey(key);
            else if (mode === 'inline') setOpenKey(isOpen ? key : null);
          }}
          className={depth > 0 && mode !== 'dialog' ? 'rounded-lg' : undefined}
        >
          {renderExtra?.(items[index], (next) => replace(index, next), index)}
        </TypedEntryCard>
      </TypedNestingProvider>
    );
  };

  const dialogIndex = dialogKey === null ? -1 : rows.keys.indexOf(dialogKey);
  const addClass = 'self-start text-primary hover:text-primary';

  return (
    <div data-slot="typed-entry-list" data-depth={depth} className="flex min-w-0 flex-col gap-2">
      {items.length > 0 && (
        <div role="list" aria-label={props['aria-label']} className="flex min-w-0 flex-col gap-1.5">
          {items.map((_, index) => (
            <div role="listitem" key={rows.keys[index]} data-row-key={rows.keys[index]} className="min-w-0">
              {card(index, inDialog ? 'row' : 'inline')}
            </div>
          ))}
        </div>
      )}
      {offeredTypes.length <= MENU_MAX_TYPES ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" className={addClass} data-slot="typed-list-add" />}>
            <Plus /> {copy.add}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-56">
            <MenuEntries
              kind="dropdown"
              entries={offeredTypes.map((type) => ({
                icon: categoryIcon(type.category),
                label: typedTypeLabel(type, { schema: text }),
                description: type.type,
                disabled: unique && used.includes(type.type),
                onSelect: () => add([type.type]),
              }))}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={addClass}
            data-slot="typed-list-add"
            onClick={() => setPickerOpen(true)}
          >
            <Plus /> {copy.add}
          </Button>
          <CatalogDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            title={copy.title}
            {...catalogData}
            addLabel={copy.add}
            onAdd={add}
            onJumpTo={unique ? jumpTo : undefined}
          />
        </>
      )}
      <CatalogDialog
        open={retypeIndex >= 0}
        onOpenChange={(isOpen) => !isOpen && setRetypeKey(null)}
        title={catalog === 'triggers' ? t('triggerTitle') : t('changeType')}
        {...catalogData}
        initialCategory={retypeIndex >= 0 ? findTypedType(source, cardEntries[retypeIndex])?.category : undefined}
        addLabel={catalog === 'triggers' ? t('changeTrigger') : t('changeType')}
        onAdd={([type]) => {
          if (type && retypeIndex >= 0) retype(retypeIndex, type);
        }}
      />
      {inDialog && (
        <Dialog open={dialogIndex >= 0} onOpenChange={(isOpen) => !isOpen && setDialogKey(null)}>
          {dialogIndex >= 0 && (
            <DialogFrame
              title={<Breadcrumb trail={[...trail, crumbOf(cardEntries[dialogIndex])]} />}
              footer={<DialogClose render={<Button variant="outline" />}>{labels.done}</DialogClose>}
            >
              {card(dialogIndex, 'dialog')}
            </DialogFrame>
          )}
        </Dialog>
      )}
    </div>
  );
}

/** A dialog title naming where the entry sits: the outer entries muted, the entry itself last. */
function Breadcrumb({ trail }: { trail: readonly string[] }) {
  return (
    <span data-slot="typed-breadcrumb" className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
      {trail.map((crumb, i) => (
        <span key={i} className="contents">
          {i > 0 && (
            <span aria-hidden className="text-text-faint">
              ›
            </span>
          )}
          <span className={i < trail.length - 1 ? 'font-normal text-text-muted' : undefined}>{crumb}</span>
        </span>
      ))}
    </span>
  );
}

// Field editors ---------------------------------------------------------------------------------------------------

/** Catalogs whose types a list holds once (a behavior is either there or not). */
const UNIQUE_CATALOGS = new Set(['blockBehaviors', 'itemBehaviors', 'furnitureBehaviors']);

/** A typed list field: its entries as cards; a single entry written without a list is edited as a one-entry list. */
export function TypedListEditor({ field, value, onChange, hideLabel }: EditorProps<TypedListField>) {
  const label = useSchemaText()(field.label);
  // A single entry may stand without a list; editing writes the list
  const list: unknown[] = Array.isArray(value) ? value : isPlainObject(value) ? [value] : [];
  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <TypedEntryList
        source={field}
        catalog={field.catalog}
        items={list}
        unique={UNIQUE_CATALOGS.has(field.catalog)}
        onChange={(next) => onChange(listOrUndefined(next))}
        aria-label={label}
      />
    </FieldShell>
  );
}

/** A type of the catalog with its other names. */
type AliasedType = TypedType & { aliases?: readonly string[] };

/**
 * The types the cards of a `typedBy` list know: those of the catalog, each with the list's other fields as its
 * fields, their other names, and every name in `names` the catalog does not know (named as written), so no entry
 * falls back to YAML only because of its type.
 */
export function typedByTypes(known: readonly AliasedType[], fields: TypedType['fields'], names: readonly string[]): TypedType[] {
  const withFields = known.map((type): TypedType => ({ ...type, fields }));
  const aliases = known.flatMap((type) => (type.aliases ?? []).map((alias): TypedType => ({ ...type, fields, type: alias, label: alias })));
  const all = [...withFields, ...aliases];
  const unknown = [...new Set(names)]
    .filter((name) => name && !all.some((type) => type.type === name))
    .map((name): TypedType => ({ type: name, label: name, fields }));
  return [...all, ...unknown];
}

/**
 * An object list whose entries are told apart by a type key (`typedBy`, e.g. CraftEngine events by their trigger in
 * `on`): each entry is a card of its type with the other fields as its body, and "Add …" picks the type. A type name
 * the catalog does not know (an alias, or written by hand) keeps its card and fields, named as written.
 */
export function TypedObjectListEditor({ field, value, onChange, hideLabel }: EditorProps<ObjectListField>) {
  const label = useSchemaText()(field.label);
  const { typedBy } = field;
  const list: unknown[] = Array.isArray(value) ? value : [];
  const key = typedBy?.key ?? 'type';
  const namesKey = list.map((entry) => (isPlainObject(entry) && typeof entry[key] === 'string' ? entry[key] : '')).join('\n');
  const source = useMemo<TypedSource>(() => {
    const types = typedByTypes(
      typedBy?.types() ?? [],
      field.fields.filter((f) => f.key !== key),
      namesKey.split('\n'),
    );
    return { types: () => types };
  }, [typedBy, field.fields, key, namesKey]);
  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <TypedEntryList
        source={source}
        catalog={typedBy?.catalog}
        items={list}
        pickerTypes={typedBy?.types}
        typeKey={key}
        newEntry={(type) => ({ ...field.newItem?.(), [key]: type })}
        onChange={(next) => onChange(listOrUndefined(next))}
        aria-label={label}
      />
    </FieldShell>
  );
}

// Older building blocks -------------------------------------------------------------------------------------------

/**
 * The searchable type input of an entry, with a Premium badge, a link to the type's docs and (for conditions) the "!"
 * toggle. The type is set when it is picked or typed out (blur, Enter), so the entry's fields do not switch on every
 * keystroke.
 */
export function TypeInput({
  source,
  entry,
  onChange,
}: {
  source: TypedSource;
  entry: Record<string, unknown>;
  onChange: (entry: Record<string, unknown>) => void;
}) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const types = source.types();
  const suggestions = useMemo<LiteralChoice[]>(
    () =>
      types.map((type) => ({ value: type.type, text: [text(type.help), type.premium && t('typed.premium')].filter(Boolean).join(' · ') })),
    [types, text, t],
  );
  const { name, inverted } = typeParts(entry.type, source.invertible);
  const known = findTypedType(source, entry);
  const setType = (nextName: string, nextInverted: boolean) => {
    const nextType = nextName && nextInverted ? `!${nextName}` : nextName;
    onChange(
      withEntryType(
        entry,
        nextType,
        types.find((type) => type.type === nextName),
      ),
    );
  };
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <TextInput
        className="max-w-72 flex-1"
        mono
        value={name}
        onChange={(next) => setType(next?.trim() ?? '', inverted)}
        suggestions={suggestions}
        placeholder={t('typed.typePlaceholder')}
        commitOnBlur
      />
      {source.invertible && (
        <Tip label={t('typed.invertHint')}>
          <Button
            type="button"
            size="sm"
            variant={inverted ? 'secondary' : 'ghost'}
            aria-pressed={inverted}
            onClick={() => setType(name, !inverted)}
          >
            ! {t('typed.invert')}
          </Button>
        </Tip>
      )}
      {known?.premium && (
        <Tip label={t('typed.premiumHint')}>
          <Badge variant="info">{t('typed.premium')}</Badge>
        </Tip>
      )}
      {known?.docs && (
        <IconButton
          label={t('typed.docs')}
          size="icon-sm"
          nativeButton={false}
          render={<a href={known.docs} target="_blank" rel="noreferrer" />}
        >
          <ExternalLink />
        </IconButton>
      )}
    </div>
  );
}

/** The body of a typed entry: the fields of its type, YAML for an unknown type, a hint while it has none. */
export function TypedEntryBody({ source, entry, onChange }: { source: TypedSource; entry: unknown; onChange: (entry: unknown) => void }) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const type = findTypedType(source, entry);
  if (type) {
    const help = text(type.help);
    const fields: ObjectField = { type: 'object', key: '', label: '', fields: type.fields };
    return (
      <div className="flex flex-col gap-2.5">
        {help && <FieldDescription className="text-xs leading-4">{help}</FieldDescription>}
        {type.fields.length > 0 && <ObjectFields field={fields} value={entry} onChange={onChange} />}
      </div>
    );
  }
  const { name } = typeParts(isPlainObject(entry) ? entry.type : undefined, source.invertible);
  if (isPlainObject(entry) && !name && Object.keys(entry).length === 0) {
    return <FieldDescription className="text-xs leading-4">{t('typed.chooseType')}</FieldDescription>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <FieldDescription className="text-xs leading-4">{t('typed.unknownType', { type: name })}</FieldDescription>
      <YamlEditor field={ENTRY_YAML} value={entry} onChange={(next) => onChange(next ?? {})} hideLabel />
    </div>
  );
}
