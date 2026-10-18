/**
 * One variant of a CraftEngine furniture in two panes: the preview with the lists of elements and hitboxes on one
 * side, and the editor of the selected element or hitbox on the other (the variant's own settings while nothing is
 * selected). Below 42 rem the panes stack. A hitbox's seats are a nested list inside its editor.
 */
import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { cn } from '@resourcepackbuilder/ui/cn';
import {
  CE_DOCS,
  CE_FURNITURE_ELEMENT_FIELDS,
  CE_FURNITURE_HITBOX_TYPES,
  CE_HITBOX_FLAG_FIELDS,
  CE_SHULKER_DIRECTIONS,
  formatFurnitureSeat,
  furnitureHitboxType,
  furnitureHitboxWithType,
  interactionHitboxSize,
  newFurnitureElement,
  newFurnitureHitbox,
  parseFurnitureSeat,
  type FurnitureSeat,
  type Vec3,
} from '@resourcepackbuilder/core/craftEngine';
import type { ConfigObject, ConfigValue, Item } from '@resourcepackbuilder/core/project';
import { FieldGroup, FieldRow, IconButton, ListEditor } from '@resourcepackbuilder/ui';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { BooleanSwitch } from '../../../components/editor/inputs/BooleanSwitch';
import { NumberInput } from '../../../components/editor/inputs/NumberInput';
import { SelectInput } from '../../../components/editor/inputs/SelectInput';
import { TextInput } from '../../../components/editor/inputs/TextInput';
import { parseVector3, Vector3Input } from '../../../components/editor/inputs/Vector3Input';
import { useOpenProject } from '../../../store/project';
import { ElementFields, KeyedFields, toNumber, useElementSummary, vectorSummary, withKey } from './DisplayElementsEditor';
import { FurniturePreview } from './FurniturePreview';
import { EntrySummary, vectorText } from '../../../components/editor/nexoFurnitureEditors';
import { FurnitureGroup, TypeSelect } from './parts';

type Edit = (next: (value: ConfigObject) => ConfigObject, historyKey?: string) => void;
type ListKey = 'elements' | 'hitboxes';

/** The selected entry of the variant: an element or a hitbox by its index. */
interface Selection {
  list: ListKey;
  index: number;
}

/** Furniture elements stand at the furniture's origin when they set no position. */
const FURNITURE_ORIGIN: Vec3 = [0, 0, 0];

/** A seat's one-line summary: where it is and the yaw it faces. */
function useSeatSummary(): (seat: unknown) => ReactNode {
  const t = useTranslations('item.ceFurniture');
  return (value) => {
    const seat = parseFurnitureSeat(value);
    if (!seat) return <EntrySummary name={t('seat')} detail={JSON.stringify(value)} />;
    const detail = [vectorText(seat.position), seat.yaw !== null && t('seatYawValue', { yaw: seat.yaw })].filter(Boolean).join(' · ');
    return <EntrySummary name={t('seat')} detail={detail} />;
  };
}

function SeatFields({ seat, onChange }: { seat: FurnitureSeat; onChange: (seat: FurnitureSeat) => void }) {
  const t = useTranslations('item.ceFurniture');
  // Without a limit of its own, a seat keeps the body facing its yaw exactly when it has one
  const limited = seat.limitPlayerRotation ?? seat.yaw !== null;
  return (
    <FieldGroup>
      <FieldRow label={t('position')} yamlKey="position">
        <Vector3Input
          label={t('seatPosition')}
          value={seat.position.join(',')}
          placeholder="0"
          onChange={(text) => onChange({ ...seat, position: (parseVector3(text)?.map((n) => n ?? 0) ?? [0, 0, 0]) as Vec3 })}
        />
      </FieldRow>
      <FieldRow label={t('seatYaw')} yamlKey="yaw">
        <NumberInput
          label={t('seatYaw')}
          className="w-28 font-mono"
          value={seat.yaw}
          placeholder="0"
          onChange={(yaw) => onChange({ ...seat, yaw: yaw ?? null })}
        />
      </FieldRow>
      <FieldRow label={t('seatLimit')} yamlKey="limit_player_rotation">
        <BooleanSwitch
          allowUnset={false}
          aria-label={t('seatLimit')}
          value={limited}
          onChange={(checked) => onChange({ ...seat, limitPlayerRotation: checked === (seat.yaw !== null) ? null : !!checked })}
        />
      </FieldRow>
      <FieldRow label={t('seatForce')} yamlKey="force_player_rotation">
        <BooleanSwitch
          allowUnset={false}
          aria-label={t('seatForce')}
          value={seat.forcePlayerRotation !== null}
          onChange={(checked) => onChange({ ...seat, forcePlayerRotation: checked ? true : null })}
        />
      </FieldRow>
    </FieldGroup>
  );
}

/** The fields of a hitbox, with its seats as a nested list; `set` changes one key, `update` the whole hitbox. */
function HitboxFields({
  hitbox,
  set,
  update,
}: {
  hitbox: Record<string, unknown>;
  set: (key: string, value: ConfigValue | undefined, historyKey?: string) => void;
  update: (next: (hitbox: ConfigObject) => ConfigObject, historyKey?: string) => void;
}) {
  const t = useTranslations('item.ceFurniture');
  const tFurniture = useTranslations('item.furniture');
  const seatSummary = useSeatSummary();
  const type = furnitureHitboxType(hitbox);
  // An interaction's size may be written as `scale: width,height`; an edit writes both as width and height
  const size = interactionHitboxSize(hitbox);
  const setSize = (key: 'width' | 'height', n: number | undefined) =>
    update((h) => {
      const { scale: _scale, width: _width, height: _height, ...rest } = h;
      const next = { ...size, [key]: n ?? null };
      return {
        ...rest,
        ...(next.width !== null ? { width: next.width } : {}),
        ...(next.height !== null ? { height: next.height } : {}),
      };
    }, key);
  const number = (key: string, label: string, placeholder: string) => (
    <FieldRow label={label} yamlKey={key}>
      <NumberInput
        label={label}
        className="w-28 font-mono"
        placeholder={placeholder}
        value={toNumber(hitbox[key])}
        onChange={(n) => set(key, n, key)}
      />
    </FieldRow>
  );
  const flag = (key: string, label: string) => (
    <FieldRow label={label} yamlKey={key}>
      <BooleanSwitch
        allowUnset={false}
        aria-label={label}
        value={hitbox[key] !== false}
        onChange={(checked) => set(key, checked ? undefined : false)}
      />
    </FieldRow>
  );
  const seats = Array.isArray(hitbox.seats) ? (hitbox.seats as ConfigValue[]) : [];
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <FieldGroup>
        <FieldRow label={t('hitboxType')} yamlKey="type">
          <TypeSelect
            label={t('hitboxType')}
            value={type}
            // Hitbox types come from core at runtime; a test checks each has a name in en and de
            options={CE_FURNITURE_HITBOX_TYPES.map((value) => ({ value, text: t(`hitboxTypes.${value}` as never) }))}
            // Keys only the old type reads (an interaction's width and height …) go with it
            onChange={(value) => update((h) => furnitureHitboxWithType(h, value))}
          />
        </FieldRow>
        <FieldRow label={t('position')} yamlKey="position">
          <Vector3Input
            label={t('position')}
            value={hitbox.position}
            placeholder="0,0,0"
            onChange={(v) => set('position', v, 'position')}
          />
        </FieldRow>
        {type === 'interaction' ? (
          <>
            <FieldRow label={t('width')} yamlKey="width">
              <NumberInput
                label={t('width')}
                className="w-28 font-mono"
                placeholder="1"
                value={size.width}
                onChange={(n) => setSize('width', n)}
              />
            </FieldRow>
            <FieldRow label={t('height')} yamlKey="height">
              <NumberInput
                label={t('height')}
                className="w-28 font-mono"
                placeholder="1"
                value={size.height}
                onChange={(n) => setSize('height', n)}
              />
            </FieldRow>
          </>
        ) : (
          number('scale', t('size'), '1')
        )}
        {type === 'shulker' && (
          <>
            {number('peek', t('peek'), '0')}
            <FieldRow label={t('direction')} yamlKey="direction">
              <SelectInput
                aria-label={t('direction')}
                value={typeof hitbox.direction === 'string' ? hitbox.direction.toLowerCase() : undefined}
                placeholder="up"
                options={CE_SHULKER_DIRECTIONS.map((value) => ({ value, text: value }))}
                onChange={(value) => set('direction', value === 'up' ? undefined : value)}
              />
            </FieldRow>
          </>
        )}
        {type === 'custom' && (
          <FieldRow label={t('entityType')} yamlKey="entity_type">
            <TextInput
              mono
              placeholder="minecraft:slime"
              value={typeof hitbox.entity_type === 'string' ? hitbox.entity_type : undefined}
              onChange={(value) => set('entity_type', value?.trim() ? value : undefined, 'entity')}
            />
          </FieldRow>
        )}
        {flag('blocks_building', t('blocksBuilding'))}
        {(type === 'interaction' || type === 'shulker') && flag('interactive', t('interactive'))}
        <KeyedFields fields={CE_HITBOX_FLAG_FIELDS} object={hitbox} siblings={{ ...hitbox, type }} set={set} historyKey="flag" />
      </FieldGroup>
      <FurnitureGroup title={t('seats')} count={seats.length}>
        <ListEditor<ConfigValue>
          aria-label={t('seats')}
          items={seats}
          onChange={(next) => set('seats', next.length > 0 ? next : undefined)}
          emptyText={tFurniture('noSeats')}
          addLabel={t('addSeat')}
          onAdd={() => set('seats', [...seats, '0,0,0 0'])}
          renderSummary={(seat) => seatSummary(seat)}
          renderEditor={(value, _change, index) => {
            const seat = parseFurnitureSeat(value);
            const replace = (next: ConfigValue, historyKey?: string) =>
              set(
                'seats',
                seats.map((s, j) => (j === index ? next : s)),
                historyKey && `seat-${index}-${historyKey}`,
              );
            return seat ? (
              <SeatFields seat={seat} onChange={(next) => replace(formatFurnitureSeat(next), 'edit')} />
            ) : (
              <FieldRow label={tFurniture('rawEntry')} error={tFurniture('rawEntryError')}>
                <TextInput
                  mono
                  value={typeof value === 'string' ? value : JSON.stringify(value)}
                  onChange={(text) => replace(text ?? '', 'raw')}
                />
              </FieldRow>
            );
          }}
        />
      </FurnitureGroup>
    </div>
  );
}

/** The detail pane's header: what is edited, and a button back to the variant's settings. */
function PaneHeader({ title, onClose }: { title: ReactNode; onClose?: () => void }) {
  const t = useTranslations('item.furniture');
  return (
    <div className="flex min-h-7.5 items-center gap-2">
      <h3 className="m-0 min-w-0 flex-1 truncate text-label font-semibold text-text">{title}</h3>
      {onClose && (
        <IconButton label={t('closeEntry')} size="icon-xs" onClick={onClose}>
          <X />
        </IconButton>
      )}
    </div>
  );
}

/** A row's summary as a button that selects the entry for the detail pane. */
function SelectRow({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        '-mx-1 flex h-7 w-[calc(100%+0.5rem)] min-w-0 cursor-pointer items-center rounded-md px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'bg-accent text-text' : 'hover:bg-surface-sunken',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

/**
 * The variant `name` of a CraftEngine furniture: its preview, elements and hitboxes, and the selected entry's editor.
 * `edit` changes the variant; `settings` is what the detail pane shows while nothing is selected (the variant's
 * placement rules and further keys).
 */
export function FurnitureVariantEditor({
  item,
  name,
  variant,
  edit,
  settings,
}: {
  item: Item;
  name: string;
  variant: Record<string, unknown>;
  edit: Edit;
  settings: ReactNode;
}) {
  const t = useTranslations('item.ceFurniture');
  const tFurniture = useTranslations('item.furniture');
  const project = useOpenProject();
  const elementSummary = useElementSummary();
  // The selection belongs to the variant it was made in
  const [picked, setPicked] = useState<(Selection & { variant: string }) | null>(null);
  const listOf = (key: ListKey) => (Array.isArray(variant[key]) ? (variant[key] as ConfigValue[]) : []);
  const elements = listOf('elements');
  const hitboxes = listOf('hitboxes');
  const selection = picked && picked.variant === name && isPlainObject(listOf(picked.list)[picked.index]) ? picked : null;
  const select = (list: ListKey, index: number) =>
    setPicked(selection?.list === list && selection.index === index ? null : { list, index, variant: name });

  const editList = (key: ListKey) => (next: (list: ConfigValue[]) => ConfigValue[], historyKey?: string) =>
    edit((v) => withKey(v, key, next(Array.isArray(v[key]) ? v[key] : [])), historyKey);
  /** Changes the entry at `index` of a list. */
  const updateEntry = (key: ListKey, index: number) => (next: (entry: ConfigObject) => ConfigObject, historyKey?: string) =>
    editList(key)(
      (list) => list.map((entry, i) => (i === index && isPlainObject(entry) ? next(entry as ConfigObject) : entry)),
      historyKey && `${key}-${index}-${historyKey}`,
    );
  /** Moves, duplicates or removes rows; the selection is dropped, since its index may now name another entry. */
  const reorder = (key: ListKey) => (next: ConfigValue[]) => {
    setPicked(null);
    editList(key)(() => next);
  };
  const add = (key: ListKey, entry: ConfigObject) => {
    const index = listOf(key).length;
    editList(key)((list) => [...list, entry]);
    setPicked({ list: key, index, variant: name });
  };

  let pane: ReactNode = settings;
  if (selection) {
    const entry = listOf(selection.list)[selection.index] as Record<string, unknown>;
    const update = updateEntry(selection.list, selection.index);
    const set = (key: string, value: ConfigValue | undefined, historyKey?: string) => update((e) => withKey(e, key, value), historyKey);
    const close = () => setPicked(null);
    pane =
      selection.list === 'elements' ? (
        <>
          <PaneHeader title={t('element', { number: selection.index + 1 })} onClose={close} />
          <ElementFields element={entry} defaultPosition={FURNITURE_ORIGIN} fields={CE_FURNITURE_ELEMENT_FIELDS} set={set} />
        </>
      ) : (
        <>
          <PaneHeader title={t('hitbox', { number: selection.index + 1 })} onClose={close} />
          <HitboxFields hitbox={entry} set={set} update={update} />
        </>
      );
  }

  return (
    <div className="grid min-w-0 gap-5 @2xl/furniture:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <FurniturePreview project={project} item={item} variantName={name} variant={variant} height={260} />
        <FurnitureGroup
          title={t('elements')}
          count={elements.length}
          help={t('elementsHelp')}
          docs={{ url: `${CE_DOCS.furnitureVariants}#elements`, target: 'craftengine' }}
        >
          <ListEditor<ConfigValue>
            aria-label={t('elements')}
            items={elements}
            onChange={reorder('elements')}
            emptyText={tFurniture('noElements')}
            addLabel={tFurniture('addElement')}
            onAdd={() => add('elements', newFurnitureElement())}
            renderSummary={(element, i) => (
              <SelectRow selected={selection?.list === 'elements' && selection.index === i} onSelect={() => select('elements', i)}>
                {isPlainObject(element) ? elementSummary(element, FURNITURE_ORIGIN) : String(element)}
              </SelectRow>
            )}
          />
        </FurnitureGroup>
        <FurnitureGroup
          title={t('hitboxes')}
          count={hitboxes.length}
          help={t('hitboxesHelp')}
          docs={{ url: `${CE_DOCS.furnitureVariants}#hitboxes`, target: 'craftengine' }}
        >
          <ListEditor<ConfigValue>
            aria-label={t('hitboxes')}
            items={hitboxes}
            onChange={reorder('hitboxes')}
            emptyText={tFurniture('noHitboxes')}
            addLabel={tFurniture('addHitbox')}
            onAdd={() => add('hitboxes', newFurnitureHitbox())}
            renderSummary={(hitbox, i) => (
              <SelectRow selected={selection?.list === 'hitboxes' && selection.index === i} onSelect={() => select('hitboxes', i)}>
                {isPlainObject(hitbox) ? <HitboxSummary hitbox={hitbox} /> : String(hitbox)}
              </SelectRow>
            )}
          />
        </FurnitureGroup>
      </div>
      <div
        data-slot="furniture-detail"
        className="flex min-w-0 flex-col gap-3 border-t border-line pt-4 @2xl/furniture:sticky @2xl/furniture:top-3 @2xl/furniture:self-start @2xl/furniture:border-t-0 @2xl/furniture:border-l @2xl/furniture:pt-0 @2xl/furniture:pl-5"
      >
        {pane}
      </div>
    </div>
  );
}

/** A hitbox's one-line summary: its type, where it is, its size and how many seats it has. */
function HitboxSummary({ hitbox }: { hitbox: Record<string, unknown> }) {
  const t = useTranslations('item.ceFurniture');
  const type = furnitureHitboxType(hitbox);
  const known = (CE_FURNITURE_HITBOX_TYPES as readonly string[]).includes(type);
  const size = interactionHitboxSize(hitbox);
  const seats = Array.isArray(hitbox.seats) ? hitbox.seats.length : 0;
  const detail = [
    vectorSummary(hitbox.position, [0, 0, 0]),
    type === 'interaction' ? `${size.width ?? 1} × ${size.height ?? 1}` : hitbox.scale !== undefined && String(hitbox.scale),
    seats > 0 && t('seatCount', { count: seats }),
  ]
    .filter(Boolean)
    .join(' · ');
  return <EntrySummary name={known ? t(`hitboxTypes.${type}` as never) : type} detail={detail} />;
}
