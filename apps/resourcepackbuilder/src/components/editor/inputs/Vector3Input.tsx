/**
 * A vector "x,y,z" (positions, translations, rotations, scales) as three compact number inputs with x, y and z
 * prefixes. The value is written once all three are numbers and cleared when all three are empty; while one is
 * missing or invalid nothing is written. Text that is no vector (an expression, a placeholder token) stays editable as
 * plain text. `parseVector3` and `formatVector3` convert between that text and a number tuple.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { formatVector, parseNumber, parseVector, type VectorParts } from '../values';
import { TextInput } from './TextInput';

interface Vector3InputProps {
  /** Id of the first input, for the field label. */
  id?: string;
  value: unknown;
  onChange: (value: string | undefined) => void;
  /** The field's name; each input is then named "<label> x" … for screen readers (else "x value" …). */
  label?: string;
  /** Each axis must be a whole number. */
  integer?: boolean;
  /** The smallest value each axis may take. */
  min?: number;
  /** The largest value each axis may take. */
  max?: number;
  /** The value shown greyed in empty inputs, e.g. "0,0.5,0" (or one value for all three, e.g. "0"). */
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

const AXES = ['x', 'y', 'z'] as const;

/** x, y and z; an axis left empty is undefined. */
export type Vector3 = readonly [x: number | undefined, y: number | undefined, z: number | undefined];

/** Reads `0.5,1,0` or `0.5 1 0` into a vector; an empty or unreadable text gives undefined. */
export function parseVector3(text: string | undefined): Vector3 | undefined {
  if (!text?.trim()) return undefined;
  const parts = text.trim().split(/\s*,\s*|\s+/);
  if (parts.length !== 3) return undefined;
  const numbers = parts.map((part) => (/^-?\d+(\.\d+)?$/.test(part) ? Number(part) : NaN));
  return numbers.some(Number.isNaN) ? undefined : [numbers[0], numbers[1], numbers[2]];
}

/** Writes a vector as `x,y,z` (another separator with `separator`); undefined when no axis is set, empty axes as 0. */
export function formatVector3(vector: Vector3 | undefined, separator = ','): string | undefined {
  if (!vector || vector.every((axis) => axis === undefined)) return undefined;
  return vector.map((axis) => axis ?? 0).join(separator);
}

/** A typed vector together with the value it was typed over. */
interface Draft {
  parts: VectorParts;
  base: unknown;
}

/** Three number inputs for one "x,y,z" value. */
export function Vector3Input({ id, value, onChange, label, integer, min, max, placeholder, invalid, className }: Vector3InputProps) {
  const t = useTranslations('editor');
  const parsed = parseVector(value);
  // The typed components while the vector is incomplete; a change of `value` from outside (undo) drops them
  const [draft, setDraft] = useState<Draft | null>(null);
  if (!parsed) {
    return <TextInput id={id} value={String(value)} onChange={onChange} placeholder={placeholder} invalid className={className} mono />;
  }
  const parts = draft && draft.base === value ? draft.parts : parsed;
  const hints = parseVector(placeholder) ?? [placeholder ?? '', placeholder ?? '', placeholder ?? ''];
  /** A typed component that is a number within the allowed range. */
  const isValid = (part: string) => {
    const n = parseNumber(part.trim().replace(',', '.'), integer);
    return n !== undefined && (min === undefined || n >= min) && (max === undefined || n <= max);
  };
  /** The value of typed components, or null while they cannot be written (incomplete or out of range). */
  const toValue = (next: VectorParts) => {
    const written = formatVector(next);
    return written && !next.every(isValid) ? null : written;
  };
  const incomplete = toValue(parts) === null;
  /** A component that keeps the vector from being written: empty, no number or out of range while others are typed. */
  const isBad = (part: string) => incomplete && !isValid(part);
  const edit = (axis: number, text: string) => {
    const next = parts.map((part, i) => (i === axis ? text : part)) as unknown as VectorParts;
    const written = toValue(next);
    if (written === null) {
      setDraft({ parts: next, base: value });
      return;
    }
    setDraft({ parts: next, base: written });
    onChange(written);
  };
  return (
    <div
      data-slot="vector3"
      role="group"
      className={cn('grid min-w-0 grid-cols-3 gap-1.5', className)}
      onBlur={(e) => {
        // Leaving the group with an incomplete vector shows the stored value again
        if (!e.currentTarget.contains(e.relatedTarget as Node | null) && incomplete) setDraft(null);
      }}
    >
      {AXES.map((axis, i) => (
        <label
          key={axis}
          className={cn(
            'flex h-7.5 min-w-0 items-center rounded-md border border-input bg-transparent text-label transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring dark:bg-input/30',
            (invalid || isBad(parts[i])) && 'border-danger',
          )}
        >
          <span aria-hidden className="flex-none pr-1 pl-2 font-mono text-meta text-text-faint">
            {axis}
          </span>
          <input
            id={i === 0 ? id : undefined}
            aria-label={label ? t('inputs.vector.axis', { label, axis }) : t('inputs.axis', { axis })}
            inputMode="decimal"
            spellCheck={false}
            className="h-full w-full min-w-0 bg-transparent pr-2 font-mono text-label tabular-nums outline-none placeholder:text-muted-foreground"
            value={parts[i]}
            placeholder={hints[i]}
            onChange={(e) => edit(i, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
