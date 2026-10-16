/** The elements, hitboxes and seats of one variant of a CraftEngine furniture. */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import {
  CE_BILLBOARDS,
  CE_DISPLAY_TRANSFORMS,
  CE_FURNITURE_ELEMENT_TYPES,
  CE_FURNITURE_HITBOX_TYPES,
  CE_SHULKER_DIRECTIONS,
  formatCeVector,
  formatFurnitureSeat,
  furnitureElementType,
  furnitureHitboxType,
  newFurnitureElement,
  newFurnitureHitbox,
  parseCeVector,
  parseFurnitureSeat,
  rotationAngles,
  type Vec3,
} from '@resourcepackbuilder/core/craftEngine';
import type { ConfigObject, ConfigValue } from '@resourcepackbuilder/core/project';
import { IconButton, useDraft } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { CheckboxField } from '../../../components/CheckboxField';

type Edit = (next: (value: ConfigObject) => ConfigObject, historyKey?: string) => void;

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

const toNumber = (value: unknown) => (typeof value === 'number' ? value : typeof value === 'string' ? parseNumber(value)?.value : undefined);

/** A labelled field of the element and hitbox cards. */
function Labelled({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-full flex flex-col gap-1' : 'flex flex-col gap-1'}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** Three number fields for a vector (`x,y,z`); a value CraftEngine cannot read shows `fallback` until it is edited. */
function VectorInput({ label, value, fallback, onChange }: { label: string; value: unknown; fallback: Vec3; onChange: (value: string) => void }) {
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
function ValueSelect({
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

/** A titled list of cards with an add button. */
function ListSection({ title, help, onAdd, children }: { title: string; help: string; onAdd: () => void; children: ReactNode }) {
  const tCommon = useTranslations('common');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
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
function EntryCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
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

/** Element types with a transform of their own (translation, rotation, scale, billboard) */
const DISPLAY_TYPES = new Set(['item_display', 'block_display', 'text_display']);
const ITEM_TYPES = new Set(['item_display', 'item', 'armor_stand']);

function ElementCard({
  element,
  index,
  set,
  onRemove,
}: {
  element: Record<string, unknown>;
  index: number;
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
        fallback={[0, 0, 0]}
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
    </EntryCard>
  );
}

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
        const replace = (next: ConfigValue, key: string) =>
          setSeats(
            seats.map((s, j) => (j === i ? next : s)) as ConfigValue[],
            key,
          );
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
                      replace(
                        formatFurnitureSeat({ ...seat, position: seat.position.map((v, j) => (j === axis ? (next ?? 0) : v)) as Vec3 }),
                        `seat-${i}-${axis}`,
                      )
                    }
                  />
                ))}
                <NumberInput
                  label={t('ceFurniture.seatYaw')}
                  placeholder={t('ceFurniture.seatYaw')}
                  value={seat.yaw ?? undefined}
                  onChange={(yaw) => replace(formatFurnitureSeat({ ...seat, yaw: yaw ?? null }), `seat-${i}-yaw`)}
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
          </div>
        );
      })}
    </div>
  );
}

function HitboxCard({
  hitbox,
  index,
  set,
  onRemove,
}: {
  hitbox: Record<string, unknown>;
  index: number;
  set: (key: string, value: ConfigValue | undefined, historyKey?: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('item');
  const type = furnitureHitboxType(hitbox);
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
          onChange={(v) => set('type', v)}
        />
      </Labelled>
      <VectorInput label={t('ceFurniture.position')} value={hitbox.position} fallback={[0, 0, 0]} onChange={(v) => set('position', v, `position-${index}`)} />
      {type === 'interaction' ? (
        <>
          {number('width', t('ceFurniture.width'), '1')}
          {number('height', t('ceFurniture.height'), '1')}
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
        {flag('interactive', t('ceFurniture.interactive'))}
      </div>
      <SeatRows
        seats={Array.isArray(hitbox.seats) ? hitbox.seats : []}
        setSeats={(seats, key) => set('seats', seats.length > 0 ? seats : undefined, key && `${key}-${index}`)}
      />
    </EntryCard>
  );
}

/** The editable lists of a variant; `edit` changes the variant. */
export function FurnitureVariantEditor({ variant, edit }: { variant: Record<string, unknown>; edit: Edit }) {
  const t = useTranslations('item');
  const listOf = (key: 'elements' | 'hitboxes') => (Array.isArray(variant[key]) ? (variant[key] as ConfigValue[]) : []);
  const setList = (key: 'elements' | 'hitboxes', list: ConfigValue[], historyKey?: string) =>
    edit((v) => withKey(v, key, list), historyKey);
  const setEntry = (key: 'elements' | 'hitboxes', index: number) => (field: string, value: ConfigValue | undefined, historyKey?: string) =>
    edit((v) => {
      const list = Array.isArray(v[key]) ? v[key] : [];
      return withKey(
        v,
        key,
        list.map((entry, i) => (i === index && isPlainObject(entry) ? withKey(entry, field, value) : entry)),
      );
    }, historyKey && `${key}-${historyKey}`);
  const removeEntry = (key: 'elements' | 'hitboxes', index: number) => setList(key, listOf(key).filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-5">
      <ListSection
        title={t('ceFurniture.elements')}
        help={t('ceFurniture.elementsHelp')}
        onAdd={() => setList('elements', [...listOf('elements'), newFurnitureElement()])}
      >
        {listOf('elements').map((element, i) =>
          isPlainObject(element) ? (
            <ElementCard key={i} element={element} index={i} set={setEntry('elements', i)} onRemove={() => removeEntry('elements', i)} />
          ) : null,
        )}
      </ListSection>
      <ListSection
        title={t('ceFurniture.hitboxes')}
        help={t('ceFurniture.hitboxesHelp')}
        onAdd={() => setList('hitboxes', [...listOf('hitboxes'), newFurnitureHitbox()])}
      >
        {listOf('hitboxes').map((hitbox, i) =>
          isPlainObject(hitbox) ? (
            <HitboxCard key={i} hitbox={hitbox} index={i} set={setEntry('hitboxes', i)} onRemove={() => removeEntry('hitboxes', i)} />
          ) : null,
        )}
      </ListSection>
    </div>
  );
}
