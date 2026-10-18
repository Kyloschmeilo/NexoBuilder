/**
 * A vector "x,y,z" (positions, translations, rotations, scales) as three compact number inputs with x, y and z
 * prefixes. The value is written once all three are numbers and cleared when all three are empty; while one is
 * missing or invalid nothing is written. Text that is no vector (an expression, a placeholder token) stays editable as
 * plain text.
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
  /** The value shown greyed in empty inputs, e.g. "0,0.5,0". */
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

const AXES = ['x', 'y', 'z'] as const;

/** A typed vector together with the value it was typed over. */
interface Draft {
  parts: VectorParts;
  base: unknown;
}

/** Three number inputs for one "x,y,z" value. */
export function Vector3Input({ id, value, onChange, placeholder, invalid, className }: Vector3InputProps) {
  const t = useTranslations('editor');
  const parsed = parseVector(value);
  // The typed components while the vector is incomplete; a change of `value` from outside (undo) drops them
  const [draft, setDraft] = useState<Draft | null>(null);
  if (!parsed) {
    return <TextInput id={id} value={String(value)} onChange={onChange} placeholder={placeholder} invalid className={className} mono />;
  }
  const parts = draft && draft.base === value ? draft.parts : parsed;
  const hints = parseVector(placeholder) ?? ['', '', ''];
  const incomplete = formatVector(parts) === null;
  /** A component that keeps the vector from being written: empty or no number while the others are typed. */
  const isBad = (part: string) => incomplete && parseNumber(part.trim().replace(',', '.')) === undefined;
  const edit = (axis: number, text: string) => {
    const next = parts.map((part, i) => (i === axis ? text : part)) as unknown as VectorParts;
    const written = formatVector(next);
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
            aria-label={t('inputs.axis', { axis })}
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
