import { useTranslations } from 'next-intl';
import { Tip, useDraft } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { parseNumber } from '../values';

interface NumberInputProps {
  id?: string;
  /** A string is shown as is (e.g. a number written as text in the YAML); null and undefined mean empty. */
  value: number | string | null | undefined;
  /** Receives undefined for an empty field; invalid text is not reported. */
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  /** Accessible name and tooltip; without it the tooltip names the allowed range. */
  label?: string;
  integer?: boolean;
  min?: number;
  max?: number;
  /** ArrowUp and ArrowDown change the value by this much (1 by default), within `min` and `max`. */
  step?: number;
  invalid?: boolean;
  className?: string;
}

type NumberValue = number | string | null | undefined;

const formatNumber = (value: NumberValue) => (value === undefined || value === null ? '' : String(value));

/** The value one arrow key press away from `current`, rounded to the step's precision and kept in range. */
export function steppedNumber(current: number, direction: 1 | -1, step = 1, min?: number, max?: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  const next = Number((current + direction * step).toFixed(decimals));
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next));
}

/** Number field that keeps intermediate states like "-" or "1." while typing; the arrow keys step the value. */
export function NumberInput({ id, value, onChange, placeholder, label, integer, min, max, step, invalid, className }: NumberInputProps) {
  const t = useTranslations('editor');
  const parse = (text: string): { value: number | undefined } | undefined => {
    if (text.trim() === '') return { value: undefined };
    const n = parseNumber(text, integer);
    return n === undefined ? undefined : { value: n };
  };
  const { draft, setDraft, reset } = useDraft<NumberValue>(value, parse, formatNumber);
  const bad = parse(draft) === undefined;
  const range = min !== undefined || max !== undefined ? t('inputs.allowedRange', { min: min ?? '−∞', max: max ?? '∞' }) : undefined;
  return (
    <Tip label={label ?? range}>
      <Input
        id={id}
        aria-label={label}
        className={className}
        aria-invalid={bad || invalid || undefined}
        inputMode={integer ? 'numeric' : 'decimal'}
        value={draft}
        placeholder={placeholder ?? (min !== undefined && max !== undefined ? `${min} – ${max}` : undefined)}
        onChange={(e) => {
          const text = e.target.value.replace(',', '.');
          setDraft(text);
          const parsed = parse(text);
          if (parsed) onChange(parsed.value);
        }}
        onBlur={reset}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          const current = parse(draft);
          if (!current) return;
          e.preventDefault();
          const next = steppedNumber(current.value ?? min ?? 0, e.key === 'ArrowUp' ? 1 : -1, step ?? 1, min, max);
          setDraft(String(next));
          onChange(next);
        }}
      />
    </Tip>
  );
}
