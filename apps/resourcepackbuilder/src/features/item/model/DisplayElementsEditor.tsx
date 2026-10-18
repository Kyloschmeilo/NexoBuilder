/**
 * The cards of display entity elements (item, block and text displays …) that CraftEngine furniture variants and
 * block entity renderers share, with the small fields the furniture editor uses too. Keys beyond an element's type,
 * item, position and transform come from core's field lists and show through the generic field editors.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  CE_BILLBOARDS,
  CE_DISPLAY_TRANSFORMS,
  CE_FURNITURE_ELEMENT_TYPES,
  formatCeVector,
  furnitureElementType,
  parseCeVector,
  rotationAngles,
  type Vec3,
} from '@resourcepackbuilder/core/craftEngine';
import type { Field } from '@resourcepackbuilder/core/form';
import type { ConfigObject, ConfigValue } from '@resourcepackbuilder/core/project';
import { IconButton, useDraft } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { FieldRenderer } from '../../../components/editor';
import { isFieldVisible } from '../../../components/editor/values';

/** The object with `key` set, or without it for `undefined`. */
export function withKey(object: Record<string, unknown>, key: string, value: ConfigValue | undefined): ConfigObject {
  const { [key]: _old, ...rest } = object as ConfigObject;
  return value === undefined ? rest : { ...rest, [key]: value };
}

const parseNumber = (text: string): { value: number | undefined } | undefined => {
  const trimmed = text.trim();
  if (trimmed === '') return { value: undefined };
  const n = Number(trimmed);
  return Number.isFinite(n) ? { value: n } : undefined;
};

/** A number from the config (a number or a numeric text), undefined otherwise. */
export const toNumber = (value: unknown) =>
  typeof value === 'number' ? value : typeof value === 'string' ? parseNumber(value)?.value : undefined;

/** A number field that keeps half-typed numbers ("-", "0.") while the user types. */
export function NumberInput({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const { draft, setDraft, reset } = useDraft(value, parseNumber, (n) => (n === undefined ? '' : String(n)));
  return (
    <Input
      className={className ?? 'h-7'}
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const parsed = parseNumber(e.target.value);
        if (parsed) onChange(parsed.value);
      }}
      onBlur={reset}
    />
  );
}

/** A labelled field of the element and hitbox cards. */
export function Labelled({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-full flex flex-col gap-1' : 'flex flex-col gap-1'}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** Three number fields for a vector (`x,y,z`); a missing value or one CraftEngine cannot read shows `fallback`. */
export function VectorInput({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: unknown;
  fallback: Vec3;
  onChange: (value: string) => void;
}) {
  const vector = parseCeVector(value) ?? fallback;
  return (
    <Labelled label={label}>
      <div className="grid grid-cols-3 gap-1">
        {vector.map((n, i) => (
          <NumberInput
            key={i}
            label={`${label} ${'xyz'[i]}`}
            value={n}
            onChange={(next) => onChange(formatCeVector(vector.map((v, j) => (j === i ? (next ?? 0) : v)) as Vec3))}
          />
        ))}
      </div>
    </Labelled>
  );
}

/** A select of fixed values that keeps an unknown value (from the YAML) visible. */
export function ValueSelect({
  label,
  value,
  values,
  name,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  name: (value: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <NativeSelect aria-label={label} className="w-full" size="sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {!values.includes(value) && <NativeSelectOption value={value}>{value}</NativeSelectOption>}
      {values.map((v) => (
        <NativeSelectOption key={v} value={v}>
          {name(v)}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/** A link to the CraftEngine wiki section of a hand-written part of the editor. */
export function DocsLink({ href }: { href: string }) {
  const t = useTranslations('item');
  return (
    <IconButton
      label={t('properties.docs.craftengine')}
      size="icon-xs"
      variant="ghost"
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noreferrer" />}
    >
      <ExternalLink />
    </IconButton>
  );
}

/** A titled list of cards with an add button (and a link to the list's wiki section). */
export function ListSection({
  title,
  help,
  docs,
  onAdd,
  children,
}: {
  title: string;
  help: string;
  docs?: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  const tCommon = useTranslations('common');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-sm font-medium">
          {title}
          {docs && <DocsLink href={docs} />}
        </span>
        <Button size="xs" variant="outline" onClick={onAdd}>
          <Plus /> {tCommon('add')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{help}</p>
      {children}
    </div>
  );
}

/** A card of a list entry with its remove button. */
export function EntryCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  const tCommon = useTranslations('common');
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{title}</span>
        <IconButton label={tCommon('remove')} size="icon-xs" variant="ghost-destructive" onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">{children}</div>
    </div>
  );
}

/** Field kinds that take a whole row of a card's grid */
const WIDE_FIELDS = new Set<Field['type']>(['object', 'objectList', 'map', 'typedList', 'choice', 'stringList', 'yaml']);

/**
 * Keys of an object edited through the generic field editors, each under its YAML key; the object's other keys stay.
 * `siblings` decides which fields show (their `showIf`, usually the object with its type written out); the advanced
 * ones sit behind a disclosure. `set` changes one key (undefined removes it).
 */
export function KeyedFields({
  fields,
  object,
  siblings,
  set,
  historyKey,
}: {
  fields: readonly Field[];
  object: Record<string, unknown>;
  siblings: Record<string, unknown>;
  set: (key: string, value: ConfigValue | undefined, historyKey?: string) => void;
  /** Prefix of the undo history key of each field (edits of one field coalesce) */
  historyKey: string;
}) {
  const t = useTranslations('item');
  const visible = fields.filter((f) => isFieldVisible(f, siblings));
  const advanced = visible.filter((f) => f.advanced);
  const grid = 'grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2';
  const render = (f: Field) => (
    // Two fields can share a key for different types (an armor stand's glow_color is a color name)
    <div key={`${f.key}:${f.label}`} className={WIDE_FIELDS.has(f.type) ? 'col-span-full' : undefined}>
      <FieldRenderer
        field={f}
        value={object[f.key]}
        siblings={siblings}
        onChange={(value) => set(f.key, value as ConfigValue | undefined, `${historyKey}-${f.key}`)}
      />
    </div>
  );
  // An advanced key the object already sets shows with the others
  const shown = visible.filter((f) => !f.advanced || object[f.key] !== undefined);
  const tucked = advanced.filter((f) => object[f.key] === undefined);
  if (visible.length === 0) return null;
  return (
    <div className="col-span-full flex flex-col gap-2">
      {shown.length > 0 && <div className={grid}>{shown.map(render)}</div>}
      {tucked.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">{t('ceFurniture.moreKeys', { count: tucked.length })}</summary>
          <div className={`${grid} mt-2`}>{tucked.map(render)}</div>
        </details>
      )}
    </div>
  );
}

/** Element types with a transform of their own (translation, rotation, scale, billboard) */
const DISPLAY_TYPES = new Set(['item_display', 'block_display', 'text_display']);
const ITEM_TYPES = new Set(['item_display', 'item', 'armor_stand']);

function ElementCard({
  element,
  index,
  defaultPosition,
  fields,
  set,
  onRemove,
}: {
  element: Record<string, unknown>;
  index: number;
  defaultPosition: Vec3;
  fields: readonly Field[];
  set: (key: string, value: ConfigValue | undefined, historyKey?: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('item');
  const type = furnitureElementType(element) ?? 'item_display';
  const text = (key: string, label: string, placeholder?: string) => (
    <Labelled label={label} wide={key === 'text'}>
      <Input
        className="h-7"
        aria-label={label}
        placeholder={placeholder}
        value={typeof element[key] === 'string' ? element[key] : ''}
        onChange={(e) => set(key, e.target.value.trim() === '' ? undefined : e.target.value, `${key}-${index}`)}
      />
    </Labelled>
  );
  const angles = rotationAngles(element.rotation);
  return (
    <EntryCard title={t('ceFurniture.element', { number: index + 1 })} onRemove={onRemove}>
      <Labelled label={t('ceFurniture.elementType')}>
        <ValueSelect
          label={t('ceFurniture.elementType')}
          value={type}
          values={CE_FURNITURE_ELEMENT_TYPES}
          // Element types come from core at runtime; a test checks each has a name in en and de
          name={(v) => t(`ceFurniture.elementTypes.${v}` as never)}
          onChange={(v) => set('type', v)}
        />
      </Labelled>
      {ITEM_TYPES.has(type) && text('item', t('ceFurniture.item'), t('ceFurniture.itemPlaceholder'))}
      {type === 'block_display' && text('block', t('ceFurniture.block'), 'minecraft:oak_planks')}
      {(type === 'better_model' || type === 'model_engine') && text('model', t('ceFurniture.model'))}
      {type === 'item_display' && (
        <Labelled label={t('ceFurniture.displayTransform')}>
          <ValueSelect
            label={t('ceFurniture.displayTransform')}
            value={String(element.display_transform ?? 'none').toLowerCase()}
            values={CE_DISPLAY_TRANSFORMS}
            name={(v) => v}
            onChange={(v) => set('display_transform', v === 'none' ? undefined : v)}
          />
        </Labelled>
      )}
      {DISPLAY_TYPES.has(type) && (
        <Labelled label={t('ceFurniture.billboard')}>
          <ValueSelect
            label={t('ceFurniture.billboard')}
            value={String(element.billboard ?? 'fixed').toLowerCase()}
            values={CE_BILLBOARDS}
            name={(v) => v}
            onChange={(v) => set('billboard', v === 'fixed' ? undefined : v)}
          />
        </Labelled>
      )}
      {type === 'text_display' && text('text', t('ceFurniture.text'))}
      <VectorInput
        label={t('ceFurniture.position')}
        value={element.position}
        fallback={defaultPosition}
        onChange={(v) => set('position', v, `position-${index}`)}
      />
      {DISPLAY_TYPES.has(type) && (
        <>
          <VectorInput
            label={t('ceFurniture.translation')}
            value={element.translation}
            fallback={[0, 0, 0]}
            onChange={(v) => set('translation', v, `translation-${index}`)}
          />
          {angles ? (
            <VectorInput
              label={t('ceFurniture.rotation')}
              value={formatCeVector(angles)}
              fallback={[0, 0, 0]}
              onChange={(v) => set('rotation', v === '0,0,0' ? undefined : v, `rotation-${index}`)}
            />
          ) : (
            text('rotation', t('ceFurniture.rotation'))
          )}
          <VectorInput
            label={t('ceFurniture.scale')}
            value={element.scale}
            fallback={[1, 1, 1]}
            onChange={(v) => set('scale', v === '1,1,1' ? undefined : v, `scale-${index}`)}
          />
        </>
      )}
      <KeyedFields fields={fields} object={element} siblings={{ ...element, type }} set={set} historyKey={String(index)} />
    </EntryCard>
  );
}

/**
 * The editable list of display elements; `edit` changes the list. A new element is `newElement()`; an element without
 * a position shows `defaultPosition(type)`, where CraftEngine puts it. `fields` are the further keys an element of the
 * context reads (core's CE_FURNITURE_ELEMENT_FIELDS or CE_RENDERER_ELEMENT_FIELDS).
 */
export function DisplayElementList({
  elements,
  edit,
  newElement,
  defaultPosition,
  fields,
  title,
  help,
  docs,
}: {
  elements: ConfigValue[];
  edit: (next: (elements: ConfigValue[]) => ConfigValue[], historyKey?: string) => void;
  newElement: () => ConfigObject;
  defaultPosition: (type: string | null) => Vec3;
  fields: readonly Field[];
  title: string;
  help: string;
  docs?: string;
}) {
  const setEntry = (index: number) => (field: string, value: ConfigValue | undefined, historyKey?: string) =>
    edit(
      (list) => list.map((entry, i) => (i === index && isPlainObject(entry) ? withKey(entry, field, value) : entry)),
      historyKey && `element-${historyKey}`,
    );
  return (
    <ListSection title={title} help={help} docs={docs} onAdd={() => edit((list) => [...list, newElement()])}>
      {elements.map((element, i) =>
        isPlainObject(element) ? (
          <ElementCard
            key={i}
            element={element}
            index={i}
            defaultPosition={defaultPosition(furnitureElementType(element))}
            fields={fields}
            set={setEntry(i)}
            onRemove={() => edit((list) => list.filter((_, j) => j !== i))}
          />
        ) : null,
      )}
    </ListSection>
  );
}
