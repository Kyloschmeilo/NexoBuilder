/**
 * Structured editors of a Nexo furniture's text entries: its hitboxes (barriers, interactions, shulkers and happy
 * ghasts in one list), seats, beds and light sources. Each entry is a `ListEditor` row with a one-line summary that
 * expands to its parts (an x/y/z offset, sizes, switches); an entry Nexo could not read stays editable as text. The
 * editors are registered by name, so the form schema's fields that name them (`Field.editor`) use them everywhere, also
 * inside a door's or a state's nested forms.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import {
  formatNexoBed,
  formatNexoHitbox,
  formatNexoLight,
  formatNexoSeat,
  NEXO_FURNITURE_EDITORS,
  NEXO_HITBOX_KINDS,
  NEXO_SHULKER_DIRECTIONS,
  newNexoHitbox,
  type NexoHitbox,
  type NexoHitboxKind,
  nexoHitboxEntries,
  type NexoVec3,
  parseNexoBed,
  parseNexoHitbox,
  parseNexoLight,
  parseNexoSeat,
  withNexoHitboxEntries,
} from '@resourcepackbuilder/core/nexo';
import { FieldGroup, FieldRow, ListEditor } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { registerFieldEditor } from '../../../components/editor';
import { FieldShell, useFieldLabel } from '../../../components/editor/FieldShell';
import { BooleanSwitch } from '../../../components/editor/inputs/BooleanSwitch';
import { NumberInput } from '../../../components/editor/inputs/NumberInput';
import { SelectInput } from '../../../components/editor/inputs/SelectInput';
import { TextInput } from '../../../components/editor/inputs/TextInput';
import { parseVector3, Vector3Input } from '../../../components/editor/inputs/Vector3Input';
import type { EditorProps } from '../../../components/editor/types';
import { toStringList } from '../../../components/editor/values';

/** An offset as the summary shows it ("0, 0.5, 0"). */
export const vectorText = (vector: readonly number[]) => vector.join(', ');

/** The list's value: undefined once it has no entries. */
const listValue = (list: unknown[]) => (list.length > 0 ? list : undefined);

/** An x/y/z offset; clearing all three axes puts it back at the furniture's block. */
function OffsetRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: NexoVec3;
  onChange: (v: NexoVec3) => void;
  placeholder?: string;
}) {
  return (
    <FieldRow label={label}>
      <Vector3Input
        label={label}
        value={value.join(',')}
        placeholder={placeholder ?? '0'}
        onChange={(text) => {
          const parsed = parseVector3(text);
          onChange(parsed ? (parsed.map((n) => n ?? 0) as NexoVec3) : [0, 0, 0]);
        }}
      />
    </FieldRow>
  );
}

/** A number of an entry; `fallback` is what an emptied required number becomes. */
function NumberRow({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
  integer,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  integer?: boolean;
}) {
  return (
    <FieldRow label={label}>
      <NumberInput
        label={label}
        className="w-28 font-mono"
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        integer={integer}
        onChange={(n) => onChange(n ?? null)}
      />
    </FieldRow>
  );
}

function SwitchRow({ label, value, onChange, help }: { label: string; value: boolean; onChange: (value: boolean) => void; help?: string }) {
  return (
    <FieldRow label={label} help={help}>
      <BooleanSwitch allowUnset={false} aria-label={label} value={value} onChange={(v) => onChange(v ?? false)} />
    </FieldRow>
  );
}

/** An entry Nexo cannot read: its text, with a note. */
function RawEntry({ text, onChange }: { text: unknown; onChange: (text: string) => void }) {
  const t = useTranslations('item.furniture');
  return (
    <FieldRow label={t('rawEntry')} error={t('rawEntryError')}>
      <TextInput value={typeof text === 'string' ? text : JSON.stringify(text)} onChange={(v) => onChange(v ?? '')} mono />
    </FieldRow>
  );
}

/** A summary line: the entry's name, then its parts in muted text. */
export function EntrySummary({ name, detail }: { name: ReactNode; detail?: ReactNode }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="flex-none">{name}</span>
      {detail && <span className="min-w-0 truncate font-mono text-meta text-text-muted">{detail}</span>}
    </span>
  );
}

/* ---------------------------------------------------------------------------------------------- hitboxes */

/** One hitbox entry with its kind. */
interface HitboxEntry {
  kind: NexoHitboxKind;
  text: unknown;
}

function HitboxFields({ hitbox, onChange }: { hitbox: NexoHitbox; onChange: (hitbox: NexoHitbox) => void }) {
  const t = useTranslations('item.furniture');
  switch (hitbox.kind) {
    case 'barriers':
      return (
        <FieldGroup>
          <OffsetRow
            label={t('position')}
            value={hitbox.from}
            onChange={(from) => onChange({ ...hitbox, from, to: from.map((n, i) => Math.max(n, hitbox.to[i])) as NexoVec3 })}
          />
          <FieldRow label={t('barrierTo')} help={t('barrierToHelp')}>
            <Vector3Input
              label={t('barrierTo')}
              value={hitbox.to.join(',')}
              placeholder={hitbox.from.join(',')}
              onChange={(text) => {
                const parsed = parseVector3(text);
                const to = parsed ? (parsed.map((n, i) => n ?? hitbox.from[i]) as NexoVec3) : hitbox.from;
                onChange({ ...hitbox, to: to.map((n, i) => Math.max(n, hitbox.from[i])) as NexoVec3 });
              }}
            />
          </FieldRow>
        </FieldGroup>
      );
    case 'interactions':
      return (
        <FieldGroup>
          <OffsetRow label={t('position')} value={hitbox.position} onChange={(position) => onChange({ ...hitbox, position })} />
          <NumberRow label={t('width')} value={hitbox.width} placeholder="1" min={0} onChange={(width) => onChange({ ...hitbox, width })} />
          <NumberRow
            label={t('height')}
            value={hitbox.height}
            placeholder="1"
            min={0}
            onChange={(height) => onChange({ ...hitbox, height })}
          />
        </FieldGroup>
      );
    case 'shulkers':
      return (
        <FieldGroup>
          <OffsetRow label={t('position')} value={hitbox.position} onChange={(position) => onChange({ ...hitbox, position })} />
          <NumberRow label={t('size')} value={hitbox.scale} min={0} onChange={(scale) => onChange({ ...hitbox, scale: scale ?? 1 })} />
          <NumberRow
            label={t('length')}
            value={hitbox.length}
            min={1}
            max={2}
            onChange={(length) => onChange({ ...hitbox, length: length ?? 1 })}
          />
          <FieldRow label={t('direction')}>
            <SelectInput
              aria-label={t('direction')}
              value={hitbox.direction ?? undefined}
              placeholder={t('directionDefault')}
              options={NEXO_SHULKER_DIRECTIONS.map((value) => ({ value, text: t(`directions.${value}`) }))}
              onChange={(direction) => onChange({ ...hitbox, direction: direction ?? null })}
            />
          </FieldRow>
          <SwitchRow label={t('visible')} value={hitbox.visible} onChange={(visible) => onChange({ ...hitbox, visible })} />
        </FieldGroup>
      );
    case 'ghasts':
      return (
        <FieldGroup>
          <OffsetRow label={t('position')} value={hitbox.position} onChange={(position) => onChange({ ...hitbox, position })} />
          <NumberRow label={t('size')} value={hitbox.scale} min={0} onChange={(scale) => onChange({ ...hitbox, scale: scale ?? 0.25 })} />
          <NumberRow
            label={t('rotation')}
            value={hitbox.rotation}
            placeholder="0"
            onChange={(rotation) => onChange({ ...hitbox, rotation })}
          />
          <SwitchRow label={t('visible')} value={hitbox.visible} onChange={(visible) => onChange({ ...hitbox, visible })} />
        </FieldGroup>
      );
  }
}

/** The parts of a hitbox after its kind, for its summary. */
function useHitboxDetail(): (hitbox: NexoHitbox) => string {
  const t = useTranslations('item.furniture');
  return (hitbox) => {
    switch (hitbox.kind) {
      case 'barriers': {
        const single = hitbox.from.every((n, i) => n === hitbox.to[i]);
        return single ? vectorText(hitbox.from) : `${vectorText(hitbox.from)} → ${vectorText(hitbox.to)}`;
      }
      case 'interactions':
        return `${vectorText(hitbox.position)} · ${hitbox.width ?? 1} × ${hitbox.height ?? 1}`;
      case 'shulkers':
        return [
          vectorText(hitbox.position),
          t('sizeValue', { value: hitbox.scale }),
          hitbox.direction && t(`directions.${hitbox.direction}` as never),
        ]
          .filter(Boolean)
          .join(' · ');
      case 'ghasts':
        return `${vectorText(hitbox.position)} · ${t('sizeValue', { value: hitbox.scale })}`;
    }
  };
}

/** "Add hitbox" with the four kinds to pick from. */
function AddHitboxButton({ onAdd }: { onAdd: (kind: NexoHitboxKind) => void }) {
  const t = useTranslations('item.furniture');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="sm" className="self-start text-primary hover:text-primary" />}
      >
        <Plus /> {t('addHitbox')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-48">
        {NEXO_HITBOX_KINDS.map((kind) => (
          <DropdownMenuItem key={kind} onClick={() => onAdd(kind)}>
            <span className="flex flex-col">
              <span>{t(`hitboxKinds.${kind}`)}</span>
              <span className="text-meta text-text-muted">{t(`hitboxKindHints.${kind}`)}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The hitboxes of a hitbox section (`{barriers, interactions, shulkers, ghasts}`) as one list; `value` is the section,
 * `onChange` receives the new one (undefined once it is empty). Other keys of the section stay.
 */
export function NexoHitboxList({ value, onChange, label }: { value: unknown; onChange: (value: unknown) => void; label: string }) {
  const t = useTranslations('item.furniture');
  const detail = useHitboxDetail();
  const entries = nexoHitboxEntries(value);
  const commit = (next: HitboxEntry[]) => onChange(withNexoHitboxEntries(value, next));
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <ListEditor<HitboxEntry>
        aria-label={label}
        items={entries}
        onChange={commit}
        // Entries are written back grouped by kind, so only an order within a kind would last
        reorderable={false}
        emptyText={t('noHitboxes')}
        renderSummary={(entry) => {
          const hitbox = parseNexoHitbox(entry.kind, entry.text);
          return <EntrySummary name={t(`hitboxKinds.${entry.kind}`)} detail={hitbox ? detail(hitbox) : String(entry.text)} />;
        }}
        renderEditor={(entry, change) => {
          const hitbox = parseNexoHitbox(entry.kind, entry.text);
          return hitbox ? (
            <HitboxFields hitbox={hitbox} onChange={(next) => change({ ...entry, text: formatNexoHitbox(next) })} />
          ) : (
            <RawEntry text={entry.text} onChange={(text) => change({ ...entry, text })} />
          );
        }}
      />
      <AddHitboxButton onAdd={(kind) => commit([...entries, { kind, text: newNexoHitbox(kind) }])} />
    </div>
  );
}

/* ---------------------------------------------------------------------------------- seats, beds, lights */

/** A list of text entries, each read by `parse` and written by `format`. */
function EntryList<T>({
  label,
  name,
  value,
  onChange,
  parse,
  format,
  summary,
  fields,
  newEntry,
  addLabel,
  emptyText,
}: {
  label: string;
  /** The name of the entry with its number ("Seat 2"). */
  name: (number: number) => string;
  value: unknown;
  onChange: (value: unknown) => void;
  parse: (text: unknown) => T | null;
  format: (entry: T) => string;
  summary: (entry: T) => string;
  fields: (entry: T, change: (entry: T) => void) => ReactNode;
  newEntry: string;
  addLabel: string;
  emptyText: string;
}) {
  // A single entry may stand without a list (`seat: 0,0,0`); the editor writes the list
  const list: unknown[] = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
  return (
    <ListEditor<unknown>
      aria-label={label}
      items={list}
      onChange={(next) => onChange(listValue(next))}
      emptyText={emptyText}
      addLabel={addLabel}
      onAdd={() => onChange([...list, newEntry])}
      renderSummary={(text, i) => {
        const entry = parse(text);
        return <EntrySummary name={name(i + 1)} detail={entry ? summary(entry) : String(text)} />;
      }}
      renderEditor={(text, change) => {
        const entry = parse(text);
        return entry ? fields(entry, (next) => change(format(next))) : <RawEntry text={text} onChange={change} />;
      }}
    />
  );
}

export function NexoSeatList({ value, onChange, label }: { value: unknown; onChange: (value: unknown) => void; label: string }) {
  const t = useTranslations('item.furniture');
  return (
    <EntryList
      label={label}
      name={(number) => t('seatName', { number })}
      value={value}
      onChange={onChange}
      parse={parseNexoSeat}
      format={formatNexoSeat}
      summary={(seat) => vectorText(seat.position)}
      fields={(seat, change) => (
        <FieldGroup>
          <OffsetRow label={t('position')} value={seat.position} onChange={(position) => change({ ...seat, position })} />
        </FieldGroup>
      )}
      newEntry="0,0.5,0"
      addLabel={t('addSeat')}
      emptyText={t('noSeats')}
    />
  );
}

export function NexoBedList({ value, onChange, label }: { value: unknown; onChange: (value: unknown) => void; label: string }) {
  const t = useTranslations('item.furniture');
  return (
    <EntryList
      label={label}
      name={(number) => t('bedName', { number })}
      value={value}
      onChange={onChange}
      parse={parseNexoBed}
      format={formatNexoBed}
      summary={(bed) =>
        [vectorText(bed.position), bed.skipNight !== false && t('skipNight'), bed.resetPhantoms !== false && t('resetPhantoms')]
          .filter(Boolean)
          .join(' · ')
      }
      fields={(bed, change) => (
        <FieldGroup>
          <OffsetRow label={t('position')} value={bed.position} onChange={(position) => change({ ...bed, position })} />
          <SwitchRow label={t('skipNight')} value={bed.skipNight ?? true} onChange={(skipNight) => change({ ...bed, skipNight })} />
          <SwitchRow
            label={t('resetPhantoms')}
            value={bed.resetPhantoms ?? true}
            onChange={(resetPhantoms) => change({ ...bed, resetPhantoms })}
          />
          <SwitchRow
            label={t('forceVisibility')}
            help={t('forceVisibilityHelp')}
            value={bed.forceVisibility ?? false}
            onChange={(forceVisibility) => change({ ...bed, forceVisibility: forceVisibility || null })}
          />
        </FieldGroup>
      )}
      newEntry="0,0,0 true true"
      addLabel={t('addBed')}
      emptyText={t('noBeds')}
    />
  );
}

export function NexoLightList({ value, onChange, label }: { value: unknown; onChange: (value: unknown) => void; label: string }) {
  const t = useTranslations('item.furniture');
  return (
    <EntryList
      label={label}
      name={(number) => t('lightName', { number })}
      value={value}
      onChange={onChange}
      parse={parseNexoLight}
      format={formatNexoLight}
      summary={(light) => `${vectorText(light.position)} · ${t('levelValue', { value: light.level ?? '–' })}`}
      fields={(light, change) => (
        <FieldGroup>
          <OffsetRow label={t('position')} value={light.position} onChange={(position) => change({ ...light, position })} />
          <NumberRow
            label={t('lightLevel')}
            value={light.level}
            min={1}
            max={15}
            integer
            onChange={(level) => change({ ...light, level })}
          />
        </FieldGroup>
      )}
      newEntry="0,0,0 15"
      addLabel={t('addLight')}
      emptyText={t('noLights')}
    />
  );
}

/* ------------------------------------------------------------------------------- as schema field editors */

/** A list editor of this module as the editor of a schema field, in the field's labelled row. */
function asFieldEditor(List: typeof NexoSeatList) {
  return function FieldEditor({ field, value, onChange, hideLabel }: EditorProps) {
    const label = useFieldLabel(field);
    return (
      <FieldShell field={field} hideLabel={hideLabel} wide>
        <List value={value} onChange={onChange} label={label} />
      </FieldShell>
    );
  };
}

registerFieldEditor(NEXO_FURNITURE_EDITORS.hitbox, asFieldEditor(NexoHitboxList));
registerFieldEditor(NEXO_FURNITURE_EDITORS.seats, asFieldEditor(NexoSeatList));
registerFieldEditor(NEXO_FURNITURE_EDITORS.beds, asFieldEditor(NexoBedList));
registerFieldEditor(NEXO_FURNITURE_EDITORS.lights, asFieldEditor(NexoLightList));

/** The text entries of a list value (a single string counts as one), for counts and summaries. */
export const entryCount = (value: unknown) => toStringList(value).length;
