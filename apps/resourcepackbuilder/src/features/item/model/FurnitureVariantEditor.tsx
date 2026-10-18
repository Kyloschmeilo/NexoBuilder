/** The elements, hitboxes and seats of one variant of a CraftEngine furniture, and the variant's further keys. */
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import {
  CE_DOCS,
  CE_FURNITURE_ELEMENT_FIELDS,
  CE_FURNITURE_HITBOX_TYPES,
  CE_FURNITURE_VARIANT_FIELDS,
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
import type { ConfigObject, ConfigValue } from '@resourcepackbuilder/core/project';
import { IconButton } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { CheckboxField } from '../../../components/CheckboxField';
import {
  DisplayElementList,
  EntryCard,
  KeyedFields,
  Labelled,
  ListSection,
  NumberInput,
  toNumber,
  ValueSelect,
  VectorInput,
  withKey,
} from './DisplayElementsEditor';

type Edit = (next: (value: ConfigObject) => ConfigObject, historyKey?: string) => void;

/** Furniture elements stand at the furniture's origin when they set no position. */
const FURNITURE_ORIGIN = (): Vec3 => [0, 0, 0];

function SeatRows({ seats, setSeats }: { seats: unknown[]; setSeats: (seats: ConfigValue[], historyKey?: string) => void }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  return (
    <div className="col-span-full flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{t('ceFurniture.seats')}</span>
        <Button size="xs" variant="ghost" onClick={() => setSeats([...(seats as ConfigValue[]), '0,0,0 0'])}>
          <Plus /> {t('ceFurniture.addSeat')}
        </Button>
      </div>
      {seats.map((value, i) => {
        const seat = parseFurnitureSeat(value);
        const replace = (next: ConfigValue, key?: string) => setSeats(seats.map((s, j) => (j === i ? next : s)) as ConfigValue[], key);
        const update = (next: Partial<FurnitureSeat>, key?: string) => seat && replace(formatFurnitureSeat({ ...seat, ...next }), key);
        // Without a limit of its own, a seat keeps the body facing its yaw exactly when it has one
        const limited = seat ? (seat.limitPlayerRotation ?? seat.yaw !== null) : false;
        return (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_4.5rem_auto] items-center gap-1">
            {seat ? (
              <>
                {seat.position.map((n, axis) => (
                  <NumberInput
                    key={axis}
                    label={`${t('ceFurniture.seatPosition')} ${'xyz'[axis]}`}
                    value={n}
                    onChange={(next) =>
                      update({ position: seat.position.map((v, j) => (j === axis ? (next ?? 0) : v)) as Vec3 }, `seat-${i}-${axis}`)
                    }
                  />
                ))}
                <NumberInput
                  label={t('ceFurniture.seatYaw')}
                  placeholder={t('ceFurniture.seatYaw')}
                  value={seat.yaw ?? undefined}
                  onChange={(yaw) => update({ yaw: yaw ?? null }, `seat-${i}-yaw`)}
                />
              </>
            ) : (
              <span className="col-span-4 truncate text-xs text-muted-foreground">{JSON.stringify(value)}</span>
            )}
            <IconButton
              label={tCommon('remove')}
              size="icon-xs"
              variant="ghost-destructive"
              onClick={() => setSeats(seats.filter((_, j) => j !== i) as ConfigValue[])}
            >
              <Trash2 />
            </IconButton>
            {seat && (
              <div className="col-span-full flex flex-wrap gap-x-6 gap-y-1 pb-1">
                <CheckboxField
                  checked={limited}
                  onChange={(checked) => update({ limitPlayerRotation: checked === (seat.yaw !== null) ? null : checked })}
                  label={t('ceFurniture.seatLimit')}
                />
                <CheckboxField
                  checked={seat.forcePlayerRotation !== null}
                  onChange={(checked) => update({ forcePlayerRotation: checked ? true : null })}
                  label={t('ceFurniture.seatForce')}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HitboxCard({
  hitbox,
  index,
  update,
  onRemove,
}: {
  hitbox: Record<string, unknown>;
  index: number;
  update: (next: (hitbox: Record<string, unknown>) => ConfigObject, historyKey?: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('item');
  const type = furnitureHitboxType(hitbox);
  const set = (key: string, value: ConfigValue | undefined, historyKey?: string) => update((h) => withKey(h, key, value), historyKey);
  // An interaction's size may be written as `scale: width,height`; an edit writes both as width and height
  const size = interactionHitboxSize(hitbox);
  const sizeField = (key: 'width' | 'height', label: string) => (
    <Labelled label={label}>
      <NumberInput
        label={label}
        placeholder="1"
        value={size[key] ?? undefined}
        onChange={(n) =>
          update((h) => {
            const { scale: _scale, width: _width, height: _height, ...rest } = h as ConfigObject;
            const next = { ...size, [key]: n ?? null };
            return {
              ...rest,
              ...(next.width !== null ? { width: next.width } : {}),
              ...(next.height !== null ? { height: next.height } : {}),
            };
          }, `${key}-${index}`)
        }
      />
    </Labelled>
  );
  const number = (key: string, label: string, placeholder: string) => (
    <Labelled label={label}>
      <NumberInput label={label} placeholder={placeholder} value={toNumber(hitbox[key])} onChange={(n) => set(key, n, `${key}-${index}`)} />
    </Labelled>
  );
  const flag = (key: string, label: string) => (
    <CheckboxField checked={hitbox[key] !== false} onChange={(checked) => set(key, checked ? undefined : false)} label={label} />
  );
  return (
    <EntryCard title={t('ceFurniture.hitbox', { number: index + 1 })} onRemove={onRemove}>
      <Labelled label={t('ceFurniture.hitboxType')}>
        <ValueSelect
          label={t('ceFurniture.hitboxType')}
          value={type}
          values={CE_FURNITURE_HITBOX_TYPES}
          // Hitbox types come from core at runtime; a test checks each has a name in en and de
          name={(v) => t(`ceFurniture.hitboxTypes.${v}` as never)}
          // Keys only the old type reads (an interaction's width and height …) go with it
          onChange={(v) => update((h) => furnitureHitboxWithType(h as ConfigObject, v))}
        />
      </Labelled>
      <VectorInput
        label={t('ceFurniture.position')}
        value={hitbox.position}
        fallback={[0, 0, 0]}
        onChange={(v) => set('position', v, `position-${index}`)}
      />
      {type === 'interaction' ? (
        <>
          {sizeField('width', t('ceFurniture.width'))}
          {sizeField('height', t('ceFurniture.height'))}
        </>
      ) : (
        number('scale', t('ceFurniture.size'), '1')
      )}
      {type === 'shulker' && (
        <>
          {number('peek', t('ceFurniture.peek'), '0')}
          <Labelled label={t('ceFurniture.direction')}>
            <ValueSelect
              label={t('ceFurniture.direction')}
              value={String(hitbox.direction ?? 'up').toLowerCase()}
              values={CE_SHULKER_DIRECTIONS}
              name={(v) => v}
              onChange={(v) => set('direction', v === 'up' ? undefined : v)}
            />
          </Labelled>
        </>
      )}
      {type === 'custom' && (
        <Labelled label={t('ceFurniture.entityType')}>
          <Input
            className="h-7"
            aria-label={t('ceFurniture.entityType')}
            placeholder="minecraft:slime"
            value={typeof hitbox.entity_type === 'string' ? hitbox.entity_type : ''}
            onChange={(e) => set('entity_type', e.target.value.trim() === '' ? undefined : e.target.value, `entity-${index}`)}
          />
        </Labelled>
      )}
      <div className="col-span-full flex flex-wrap gap-x-6 gap-y-2">
        {flag('blocks_building', t('ceFurniture.blocksBuilding'))}
        {(type === 'interaction' || type === 'shulker') && flag('interactive', t('ceFurniture.interactive'))}
      </div>
      <KeyedFields fields={CE_HITBOX_FLAG_FIELDS} object={hitbox} siblings={{ ...hitbox, type }} set={set} historyKey={`flag-${index}`} />
      <SeatRows
        seats={Array.isArray(hitbox.seats) ? hitbox.seats : []}
        setSeats={(seats, key) => set('seats', seats.length > 0 ? seats : undefined, key && `${key}-${index}`)}
      />
    </EntryCard>
  );
}

/** The variant's further keys and its editable lists; `edit` changes the variant. */
export function FurnitureVariantEditor({ variant, edit }: { variant: Record<string, unknown>; edit: Edit }) {
  const t = useTranslations('item');
  const listOf = (key: 'elements' | 'hitboxes') => (Array.isArray(variant[key]) ? (variant[key] as ConfigValue[]) : []);
  const editList = (key: 'elements' | 'hitboxes') => (next: (list: ConfigValue[]) => ConfigValue[], historyKey?: string) =>
    edit((v) => withKey(v, key, next(Array.isArray(v[key]) ? v[key] : [])), historyKey);
  const editHitboxes = editList('hitboxes');
  const updateHitbox = (index: number) => (next: (hitbox: Record<string, unknown>) => ConfigObject, historyKey?: string) =>
    editHitboxes(
      (list) => list.map((entry, i) => (i === index && isPlainObject(entry) ? next(entry) : entry)),
      historyKey && `hitboxes-${historyKey}`,
    );

  return (
    <div className="flex flex-col gap-5">
      <KeyedFields
        fields={CE_FURNITURE_VARIANT_FIELDS}
        object={variant}
        siblings={variant}
        set={(key, value, historyKey) => edit((v) => withKey(v, key, value), historyKey)}
        historyKey="variant"
      />
      <DisplayElementList
        elements={listOf('elements')}
        edit={editList('elements')}
        newElement={newFurnitureElement}
        defaultPosition={FURNITURE_ORIGIN}
        fields={CE_FURNITURE_ELEMENT_FIELDS}
        title={t('ceFurniture.elements')}
        help={t('ceFurniture.elementsHelp')}
        docs={`${CE_DOCS.furnitureVariants}#elements`}
      />
      <ListSection
        title={t('ceFurniture.hitboxes')}
        help={t('ceFurniture.hitboxesHelp')}
        docs={`${CE_DOCS.furnitureVariants}#hitboxes`}
        onAdd={() => editHitboxes((list) => [...list, newFurnitureHitbox()])}
      >
        {listOf('hitboxes').map((hitbox, i) =>
          isPlainObject(hitbox) ? (
            <HitboxCard
              key={i}
              hitbox={hitbox}
              index={i}
              update={updateHitbox(i)}
              onRemove={() => editHitboxes((list) => list.filter((_, j) => j !== i))}
            />
          ) : null,
        )}
      </ListSection>
    </div>
  );
}
