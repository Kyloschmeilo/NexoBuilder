/** Individual input fields that the FieldRenderer composes. */
import { useEffect, useId, useState, type ComponentProps, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import type { Option } from '@resourcepackbuilder/core/nexo/options';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { NativeSelect, NativeSelectOption } from '../components/native-select';
import { ToggleGroup, ToggleGroupItem } from '../components/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/tooltip';
import { useSchemaText } from './schemaText';

export function Datalist({ id, options }: { id: string; options?: Option[] }) {
  const text = useSchemaText();
  if (!options?.length) return null;
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label && o.label !== o.value ? text(o.label) : undefined}
        </option>
      ))}
    </datalist>
  );
}

/** Small icon-only button with a tooltip (used for list and section controls). */
export function IconButton({
  label,
  children,
  danger,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, 'children'> & { label: string; children: ReactNode; danger?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn(danger && 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive', className)}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
  className?: string;
}

export function TextInput({ value, onChange, placeholder, suggestions, invalid, mono, autoFocus, className }: TextInputProps) {
  const listId = useId();
  return (
    <>
      <Input
        className={cn(mono && 'font-mono', className)}
        aria-invalid={invalid || undefined}
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
  className?: string;
}

/** Number field with a local draft so intermediate states like "-" or "1." can be typed. */
export function NumberInput({ value, onChange, placeholder, integer, min, max, invalid, className }: NumberInputProps) {
  const t = useTranslations('ui');
  const external = value === undefined || value === null ? '' : String(value);
  const [draft, setDraft] = useState(external);
  useEffect(() => {
    const parsedDraft = parseNumber(draft, integer);
    if (parsedDraft === undefined ? external !== '' : String(parsedDraft) !== external) setDraft(external);
  }, [external]);
  const parsed = parseNumber(draft, integer);
  const bad = draft.trim() !== '' && parsed === undefined;
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
        const n = parseNumber(text, integer);
        if (text.trim() === '') onChange(undefined);
        else if (n !== undefined) onChange(n);
      }}
      onBlur={() => setDraft(external)}
      title={min !== undefined || max !== undefined ? t('inputs.allowedRange', { min: min ?? '−∞', max: max ?? '∞' }) : undefined}
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

const TRI_ITEM = 'px-3.5 text-muted-foreground hover:bg-muted hover:text-foreground data-pressed:bg-accent data-pressed:font-semibold data-pressed:text-primary';

export function TriState({ value, onChange, allowUnset = true, defaultHint }: TriStateProps) {
  const t = useTranslations('ui');
  const common = useTranslations('common');
  const current = value === undefined ? 'unset' : String(value);
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      className="bg-background"
      value={[current]}
      onValueChange={(next: string[]) => {
        // Clicking the active button keeps the selection (radio behaviour)
        const picked = next.find((v) => v !== current) ?? next[0];
        if (!picked || picked === current) return;
        onChange(picked === 'unset' ? undefined : picked === 'true');
      }}
    >
      {allowUnset && (
        <Tooltip>
          <TooltipTrigger render={<ToggleGroupItem value="unset" className={TRI_ITEM} />}>
            {defaultHint === undefined ? t('inputs.default') : t('inputs.defaultWithHint', { value: defaultHint ? common('yes') : common('no') })}
          </TooltipTrigger>
          <TooltipContent>{t('inputs.defaultTooltip')}</TooltipContent>
        </Tooltip>
      )}
      <ToggleGroupItem value="true" className={TRI_ITEM}>
        {common('yes')}
      </ToggleGroupItem>
      <ToggleGroupItem value="false" className={cn(TRI_ITEM, 'data-pressed:bg-muted data-pressed:text-destructive')}>
        {common('no')}
      </ToggleGroupItem>
    </ToggleGroup>
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
  const t = useTranslations('ui');
  const text = useSchemaText();
  if (allowCustom) {
    return <TextInput value={value} onChange={onChange} suggestions={options} placeholder={text(placeholder) ?? t('inputs.selectOrType')} />;
  }
  const known = options.some((o) => o.value === value);
  return (
    <NativeSelect className="w-full" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <NativeSelectOption value="">
        {placeholder ? t('inputs.placeholderOption', { placeholder: text(placeholder) ?? placeholder }) : t('inputs.notSetOption')}
      </NativeSelectOption>
      {!known && value && <NativeSelectOption value={value}>{value}</NativeSelectOption>}
      {options.map((o) => (
        <NativeSelectOption key={o.value} value={o.value}>
          {o.label ? text(o.label) : o.value}
        </NativeSelectOption>
      ))}
    </NativeSelect>
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
  const t = useTranslations('ui');
  const common = useTranslations('common');
  return (
    <>
      <IconButton label={t('inputs.moveUp')} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
        <ArrowUp />
      </IconButton>
      <IconButton label={t('inputs.moveDown')} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}>
        <ArrowDown />
      </IconButton>
      <IconButton label={common('remove')} danger onClick={onRemove}>
        <Trash2 />
      </IconButton>
    </>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" className="self-start" onClick={onClick}>
      <Plus /> {label}
    </Button>
  );
}

export function moveInArray<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [entry] = copy.splice(from, 1);
  copy.splice(to, 0, entry);
  return copy;
}

/** Color picker that edits the Nexo color value "R, G, B". */
export function ColorInput({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  const t = useTranslations('ui');
  const m = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/.exec(value ?? '');
  const hex = m ? `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}` : '#ffffff';
  return (
    <Input
      type="color"
      value={hex}
      title={t('inputs.pickColor')}
      aria-label={t('inputs.pickColor')}
      className="h-8 w-10 flex-none cursor-pointer p-0.5"
      onChange={(e) => {
        const h = e.target.value;
        const rgb = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
        onChange(rgb.join(', '));
      }}
    />
  );
}
