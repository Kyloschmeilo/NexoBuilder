/**
 * The display entity elements (item, block and text displays …) that CraftEngine furniture variants and block entity
 * renderers share: an element's one-line summary ("Item display · this item · 0, 0.5, 0"), its fields as field rows
 * with x/y/z inputs for position, translation, rotation and scale, and the list of elements. Keys beyond an element's
 * type, item, position and transform come from core's field lists and show through the generic field editors, the
 * rarely used ones under "More options".
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
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
import { FieldGroup, FieldRow, ListEditor, MoreOptions } from '@resourcepackbuilder/ui';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { FieldRenderer } from '../../../components/editor';
import { SelectInput } from '../../../components/editor/inputs/SelectInput';
import { TextInput } from '../../../components/editor/inputs/TextInput';
import { Vector3Input } from '../../../components/editor/inputs/Vector3Input';
import { isFieldVisible } from '../../../components/editor/values';
import { EntrySummary, vectorText } from '../../../components/editor/nexoFurnitureEditors';
import { FurnitureGroup, TypeSelect } from './parts';

/** The object with `key` set, or without it for `undefined`. */
export function withKey(object: Record<string, unknown>, key: string, value: ConfigValue | undefined): ConfigObject {
  const { [key]: _old, ...rest } = object as ConfigObject;
  return value === undefined ? rest : { ...rest, [key]: value };
}

/** A number from the config (a number or a numeric text), undefined otherwise. */
export const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : undefined;
};

/** A CraftEngine vector as the summary shows it ("0, 0.5, 0"), the text itself when it is no vector. */
export function vectorSummary(value: unknown, fallback: Vec3): string {
  if (value === undefined) return vectorText(fallback);
  const vector = parseCeVector(value);
  return vector ? vectorText(vector) : String(value);
}

/**
 * Keys of an object edited through the generic field editors, each in its field row; the object's other keys stay.
 * `siblings` decides which fields show (their `showIf`, usually the object with its type written out); the advanced
 * ones sit under "More options" unless they are set. `set` changes one key (undefined removes it).
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
  const visible = fields.filter((f) => isFieldVisible(f, siblings));
  if (visible.length === 0) return null;
  const render = (f: Field) => (
    // Two fields can share a key for different types (an armor stand's glow_color is a color name)
    <FieldRenderer
      key={`${f.key}:${f.label}`}
      field={f}
      value={object[f.key]}
      siblings={siblings}
      onChange={(value) => set(f.key, value as ConfigValue | undefined, `${historyKey}-${f.key}`)}
    />
  );
  // An advanced key the object already sets shows with the others
  const shown = visible.filter((f) => !f.advanced || object[f.key] !== undefined);
  const tucked = visible.filter((f) => f.advanced && object[f.key] === undefined);
  return (
    <FieldGroup>
      {shown.map(render)}
      {tucked.length > 0 && (
        <MoreOptions count={tucked.length}>
          <FieldGroup>{tucked.map(render)}</FieldGroup>
        </MoreOptions>
      )}
    </FieldGroup>
  );
}

/** Element types with a transform of their own (translation, rotation, scale, billboard) */
const DISPLAY_TYPES = new Set(['item_display', 'block_display', 'text_display']);
const ITEM_TYPES = new Set(['item_display', 'item', 'armor_stand']);

/** The one-line summary of an element: its type, what it shows and where. */
export function useElementSummary(): (element: Record<string, unknown>, defaultPosition: Vec3) => ReactNode {
  const t = useTranslations('item.ceFurniture');
  return (element, defaultPosition) => {
    const type = furnitureElementType(element) ?? 'item_display';
    const known = (CE_FURNITURE_ELEMENT_TYPES as readonly string[]).includes(type);
    // Element types come from core at runtime; a test checks each has a name in en and de
    const name = known ? t(`elementTypes.${type}` as never) : type;
    const shows = ITEM_TYPES.has(type)
      ? typeof element.item === 'string'
        ? element.item
        : t('itemPlaceholder')
      : [element.block, element.text, element.model].find((value) => typeof value === 'string');
    const where = vectorSummary(element.position, defaultPosition);
    return <EntrySummary name={name} detail={[shows, where].filter(Boolean).join(' · ')} />;
  };
}

/**
 * The fields of one element: its type and what it shows, its position and transform, then the further keys of its
 * type (`fields`). An element without a position shows `defaultPosition`, where CraftEngine puts it.
 */
export function ElementFields({
  element,
  defaultPosition,
  fields,
  set,
}: {
  element: Record<string, unknown>;
  defaultPosition: Vec3;
  fields: readonly Field[];
  set: (key: string, value: ConfigValue | undefined, historyKey?: string) => void;
}) {
  const t = useTranslations('item.ceFurniture');
  const type = furnitureElementType(element) ?? 'item_display';
  const text = (key: string, label: string, placeholder?: string) => (
    <FieldRow label={label} yamlKey={key} layout={key === 'text' ? 'stacked' : undefined}>
      <TextInput
        value={typeof element[key] === 'string' ? element[key] : undefined}
        placeholder={placeholder}
        mono={key !== 'text'}
        onChange={(value) => set(key, value?.trim() ? value : undefined, key)}
      />
    </FieldRow>
  );
  const select = (key: string, label: string, values: readonly string[], fallback: string, name: (v: string) => string = (v) => v) => (
    <FieldRow label={label} yamlKey={key}>
      <SelectInput
        aria-label={label}
        value={typeof element[key] === 'string' ? element[key].toLowerCase() : undefined}
        placeholder={name(fallback)}
        options={values.map((value) => ({ value, text: name(value) }))}
        onChange={(value) => set(key, value === fallback ? undefined : value)}
      />
    </FieldRow>
  );
  const vector = (key: string, label: string, fallback: Vec3, value: unknown = element[key], none?: string) => (
    <FieldRow label={label} yamlKey={key}>
      <Vector3Input
        label={label}
        value={value}
        placeholder={formatCeVector(fallback)}
        onChange={(next) => set(key, next === undefined || next === none ? undefined : next, key)}
      />
    </FieldRow>
  );
  const angles = rotationAngles(element.rotation);
  return (
    <FieldGroup>
      <FieldRow label={t('elementType')} yamlKey="type">
        <TypeSelect
          label={t('elementType')}
          value={type}
          // Element types come from core at runtime; a test checks each has a name in en and de
          options={CE_FURNITURE_ELEMENT_TYPES.map((value) => ({ value, text: t(`elementTypes.${value}` as never) }))}
          onChange={(value) => set('type', value)}
        />
      </FieldRow>
      {ITEM_TYPES.has(type) && text('item', t('item'), t('itemPlaceholder'))}
      {type === 'block_display' && text('block', t('block'), 'minecraft:oak_planks')}
      {(type === 'better_model' || type === 'model_engine') && text('model', t('model'))}
      {type === 'text_display' && text('text', t('text'))}
      {vector('position', t('position'), defaultPosition)}
      {DISPLAY_TYPES.has(type) && (
        <>
          {vector('translation', t('translation'), [0, 0, 0])}
          {vector('rotation', t('rotation'), [0, 0, 0], angles ? formatCeVector(angles) : element.rotation, '0,0,0')}
          {vector('scale', t('scale'), [1, 1, 1], element.scale, '1,1,1')}
          {type === 'item_display' && select('display_transform', t('displayTransform'), CE_DISPLAY_TRANSFORMS, 'none')}
          {select('billboard', t('billboard'), CE_BILLBOARDS, 'fixed')}
        </>
      )}
      <KeyedFields fields={fields} object={element} siblings={{ ...element, type }} set={set} historyKey="element" />
    </FieldGroup>
  );
}

/**
 * The editable list of display elements as a titled group of rows that expand to their fields; `edit` changes the
 * list. A new element is `newElement()`; an element without a position shows `defaultPosition(type)`. `fields` are
 * the further keys an element of the context reads (core's CE_FURNITURE_ELEMENT_FIELDS or CE_RENDERER_ELEMENT_FIELDS).
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
  help?: string;
  docs?: string;
}) {
  const t = useTranslations('item.furniture');
  const summary = useElementSummary();
  const positionOf = (element: unknown) => defaultPosition(isPlainObject(element) ? furnitureElementType(element) : null);
  return (
    <FurnitureGroup title={title} count={elements.length} docs={docs ? { url: docs, target: 'craftengine' } : undefined} help={help}>
      <ListEditor<ConfigValue>
        aria-label={title}
        items={elements}
        onChange={(next) => edit(() => next)}
        emptyText={t('noElements')}
        addLabel={t('addElement')}
        onAdd={() => edit((list) => [...list, newElement()])}
        renderSummary={(element) => (isPlainObject(element) ? summary(element, positionOf(element)) : String(element))}
        renderEditor={(element, _change, index) =>
          isPlainObject(element) ? (
            <ElementFields
              element={element}
              defaultPosition={positionOf(element)}
              fields={fields}
              set={(key, value, historyKey) =>
                edit(
                  (list) => list.map((entry, i) => (i === index && isPlainObject(entry) ? withKey(entry, key, value) : entry)),
                  historyKey && `element-${index}-${historyKey}`,
                )
              }
            />
          ) : null
        }
      />
    </FurnitureGroup>
  );
}
