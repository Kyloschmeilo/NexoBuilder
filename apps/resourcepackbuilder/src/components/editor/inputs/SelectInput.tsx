/**
 * The control for picking one of a fixed set of options, chosen by how many there are: segments for up to four, a
 * select for up to twelve, and a combobox with search above that (materials, sounds, block ids). Options the user may
 * extend (`allowCustom`) are free text with the options as suggestions. Each control has a "not set" choice, and a
 * value outside the options is kept and shown as is.
 */
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedOption } from '@resourcepackbuilder/ui';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@resourcepackbuilder/ui/components/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@resourcepackbuilder/ui/components/select';
import { choiceControl } from '../values';
import { useChoiceText, type Choice } from './choices';
import { TextInput } from './TextInput';

interface SelectInputProps {
  id?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: readonly Choice[];
  /** Free text with the options as suggestions instead of a fixed list. */
  allowCustom?: boolean;
  /** Display text of the empty choice of a select or combobox. */
  placeholder?: string;
  /** Accessible name when no label points at the control. */
  'aria-label'?: string;
}

/** An option with its display text resolved. */
interface Labelled {
  value: string;
  label: string;
}

/** The segment that stands for "not set" (no option has this value). */
const UNSET = '__unset__';

/** Most combobox entries shown at once; typing narrows them down. */
const COMBOBOX_LIMIT = 100;

/** Matches the typed query against an option's value and its display text. */
function matches(option: Labelled, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || option.value.toLowerCase().includes(q) || option.label.toLowerCase().includes(q);
}

/** One of a fixed set of options, with a control that fits the number of options. */
export function SelectInput({ id, value, onChange, options, allowCustom, placeholder, ...props }: SelectInputProps) {
  const t = useTranslations('editor');
  const choiceText = useChoiceText();
  const labelled = useMemo<Labelled[]>(
    () => options.map((o) => ({ value: o.value, label: choiceText(o) ?? o.value })),
    [options, choiceText],
  );
  if (allowCustom) {
    return (
      <TextInput id={id} value={value} onChange={onChange} suggestions={options} placeholder={placeholder ?? t('inputs.selectOrType')} />
    );
  }
  const known = value === undefined || labelled.some((o) => o.value === value);
  const items: Labelled[] = known || value === undefined ? labelled : [{ value, label: value }, ...labelled];
  // A value outside the options cannot be a segment; the select shows it as is
  const fitting = choiceControl(labelled.length);
  const control = !known && fitting === 'segmented' ? 'select' : fitting;
  const unsetLabel = placeholder ?? t('inputs.notSet');

  if (control === 'segmented') {
    const segments: Array<SegmentedOption<string>> = [
      { value: UNSET, label: t('inputs.notSet'), hint: t('inputs.notSetHint') },
      ...items.map((o) => ({ value: o.value, label: o.label, hint: o.label !== o.value ? o.value : undefined })),
    ];
    return (
      <SegmentedControl
        className="self-start"
        aria-label={props['aria-label']}
        value={value ?? UNSET}
        options={segments}
        onChange={(next) => onChange(next === UNSET ? undefined : next)}
      />
    );
  }

  if (control === 'select') {
    return (
      <Select<string | null>
        items={[{ value: null, label: unsetLabel }, ...items]}
        value={value ?? null}
        onValueChange={(next) => onChange(next ?? undefined)}
      >
        <SelectTrigger id={id} aria-label={props['aria-label']} className="w-full">
          <SelectValue className={value === undefined ? 'text-text-muted' : undefined} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null} className="text-text-muted">
            {unsetLabel}
          </SelectItem>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const selected = items.find((o) => o.value === value) ?? null;
  return (
    <Combobox<Labelled>
      items={items}
      value={selected}
      onValueChange={(next) => onChange(next?.value)}
      itemToStringLabel={(o) => o.label}
      itemToStringValue={(o) => o.value}
      isItemEqualToValue={(a, b) => a.value === b.value}
      filter={matches}
      limit={COMBOBOX_LIMIT}
    >
      <ComboboxInput
        id={id}
        aria-label={props['aria-label']}
        className="w-full"
        placeholder={t('inputs.searchOptions', { placeholder: unsetLabel })}
        showClear={selected !== null}
        spellCheck={false}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t('inputs.noMatches')}</ComboboxEmpty>
        <ComboboxList>
          {(o: Labelled) => (
            <ComboboxItem key={o.value} value={o}>
              <span className="min-w-0 truncate">{o.label}</span>
              {o.label !== o.value && <span className="ml-auto min-w-0 truncate font-mono text-meta text-text-muted">{o.value}</span>}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
