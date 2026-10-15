import { useTranslations } from 'next-intl';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { useDraft } from '../useDraft';
import { parseNumber } from '../values';

interface NumberInputProps {
  /** A string is shown as is (e.g. a number written as text in the YAML); null and undefined mean empty. */
  value: number | string | null | undefined;
  /** Receives undefined for an empty field; invalid text is not reported. */
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  integer?: boolean;
  min?: number;
  max?: number;
  invalid?: boolean;
  className?: string;
}

type NumberValue = number | string | null | undefined;

const formatNumber = (value: NumberValue) => (value === undefined || value === null ? '' : String(value));

/** Number field that keeps intermediate states like "-" or "1." while typing. */
export function NumberInput({ value, onChange, placeholder, integer, min, max, invalid, className }: NumberInputProps) {
  const t = useTranslations('ui');
  const parse = (text: string): { value: number | undefined } | undefined => {
    if (text.trim() === '') return { value: undefined };
    const n = parseNumber(text, integer);
    return n === undefined ? undefined : { value: n };
  };
  const { draft, setDraft, reset } = useDraft<NumberValue>(value, parse, formatNumber);
  const bad = parse(draft) === undefined;
  return (
    <Input
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
      title={min !== undefined || max !== undefined ? t('inputs.allowedRange', { min: min ?? '−∞', max: max ?? '∞' }) : undefined}
    />
  );
}
