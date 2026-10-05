/** Einzelne Eingabefelder, die der FieldRenderer zusammensetzt. */
import { useEffect, useId, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { Option } from '../../core/nexo/options';

export function Datalist({ id, options }: { id: string; options?: Option[] }) {
  if (!options?.length) return null;
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label && o.label !== o.value ? o.label : undefined}
        </option>
      ))}
    </datalist>
  );
}

interface TextInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  suggestions?: Option[];
  invalid?: boolean;
  mono?: boolean;
  autoFocus?: boolean;
}

export function TextInput({ value, onChange, placeholder, suggestions, invalid, mono, autoFocus }: TextInputProps) {
  const listId = useId();
  return (
    <>
      <input
        className={`input ${invalid ? 'invalid' : ''} ${mono ? 'mono' : ''}`}
        value={value ?? ''}
        placeholder={placeholder}
        list={suggestions?.length ? listId : undefined}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        spellCheck={false}
      />
      <Datalist id={listId} options={suggestions} />
    </>
  );
}

interface NumberInputProps {
  value: number | string | undefined | null;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  integer?: boolean;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
}

/** Zahlenfeld mit lokalem Entwurf, damit Zwischenstände wie "-" oder "1." getippt werden können. */
export function NumberInput({ value, onChange, placeholder, integer, min, max, invalid }: NumberInputProps) {
  const external = value === undefined || value === null ? '' : String(value);
  const [draft, setDraft] = useState(external);
  useEffect(() => {
    const parsedDraft = parseNumber(draft, integer);
    if (parsedDraft === undefined ? external !== '' : String(parsedDraft) !== external) setDraft(external);
  }, [external]);
  const parsed = parseNumber(draft, integer);
  const bad = draft.trim() !== '' && parsed === undefined;
  return (
    <input
      className={`input ${bad || invalid ? 'invalid' : ''}`}
      inputMode={integer ? 'numeric' : 'decimal'}
      value={draft}
      placeholder={placeholder ?? (min !== undefined && max !== undefined ? `${min} – ${max}` : undefined)}
      onChange={(e) => {
        const text = e.target.value.replace(',', '.');
        setDraft(text);
        const n = parseNumber(text, integer);
        if (text.trim() === '') onChange(undefined);
        else if (n !== undefined) onChange(n);
      }}
      onBlur={() => setDraft(external)}
      title={min !== undefined || max !== undefined ? `Erlaubt: ${min ?? '−∞'} bis ${max ?? '∞'}` : undefined}
    />
  );
}

function parseNumber(text: string, integer?: boolean): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  if (!/^-?\d+(\.\d+)?$/.test(t)) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  if (integer && !Number.isInteger(n)) return undefined;
  return n;
}

interface TriStateProps {
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
  allowUnset?: boolean;
  defaultHint?: boolean;
}

export function TriState({ value, onChange, allowUnset = true, defaultHint }: TriStateProps) {
  return (
    <div className="tristate" role="radiogroup">
      {allowUnset && (
        <button
          type="button"
          className={value === undefined ? 'active' : ''}
          onClick={() => onChange(undefined)}
          title="Nicht gesetzt – Nexo verwendet den Standardwert"
        >
          {defaultHint === undefined ? 'Standard' : `Standard (${defaultHint ? 'Ja' : 'Nein'})`}
        </button>
      )}
      <button type="button" className={value === true ? 'active yes' : ''} onClick={() => onChange(true)}>
        Ja
      </button>
      <button type="button" className={value === false ? 'active no' : ''} onClick={() => onChange(false)}>
        Nein
      </button>
    </div>
  );
}

interface SelectInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: Option[];
  allowCustom?: boolean;
  placeholder?: string;
}

export function SelectInput({ value, onChange, options, allowCustom, placeholder }: SelectInputProps) {
  if (allowCustom) {
    return <TextInput value={value} onChange={onChange} suggestions={options} placeholder={placeholder ?? 'Auswählen oder eingeben'} />;
  }
  const known = options.some((o) => o.value === value);
  return (
    <select className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">{placeholder ? `– ${placeholder} –` : '– nicht gesetzt –'}</option>
      {!known && value && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label ?? o.value}
        </option>
      ))}
    </select>
  );
}

interface ListControlsProps {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  compact?: boolean;
}

export function ListControls({ index, count, onMove, onRemove }: ListControlsProps) {
  return (
    <>
      <button className="btn ghost icon small" title="Nach oben" disabled={index === 0} onClick={() => onMove(index, index - 1)}>
        <ArrowUp size={14} />
      </button>
      <button className="btn ghost icon small" title="Nach unten" disabled={index === count - 1} onClick={() => onMove(index, index + 1)}>
        <ArrowDown size={14} />
      </button>
      <button className="btn ghost icon small danger" title="Entfernen" onClick={onRemove}>
        <Trash2 size={14} />
      </button>
    </>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={onClick} type="button">
      <Plus size={14} /> {label}
    </button>
  );
}

export function moveInArray<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [entry] = copy.splice(from, 1);
  copy.splice(to, 0, entry);
  return copy;
}

/** Farbwähler, der den Nexo-Farbwert "R, G, B" bearbeitet. */
export function ColorInput({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  const m = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/.exec(value ?? '');
  const hex = m ? `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}` : '#ffffff';
  return (
    <input
      type="color"
      value={hex}
      title="Farbe wählen"
      style={{ width: 38, height: 32, padding: 2, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-input)' }}
      onChange={(e) => {
        const h = e.target.value;
        const rgb = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
        onChange(rgb.join(', '));
      }}
    />
  );
}
