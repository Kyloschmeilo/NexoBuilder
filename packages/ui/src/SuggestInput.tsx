/**
 * Free text with suggestions: Base UI's Autocomplete (the free-text sibling of Combobox) dressed in the
 * shadcn combobox parts. The value is always the typed text; picking a suggestion only fills it in.
 */
import { Autocomplete } from '@base-ui/react';
import type { KeyboardEvent } from 'react';
import { cn } from 'cn';
import { ComboboxContent, ComboboxInput, ComboboxList } from './components/combobox';

/** Most suggestions shown at once; typing narrows them down. */
const SUGGESTION_LIMIT = 50;

export interface Suggestion {
  value: string;
  /** Explanation shown next to the value (e.g. an item's name); not inserted */
  label?: string;
}

interface SuggestInputProps {
  id?: string;
  value: string;
  /** `picked`: the value comes from a suggestion the user chose (not from typing) */
  onValueChange: (value: string, picked: boolean) => void;
  suggestions: readonly Suggestion[];
  placeholder?: string;
  /** Class of the input group (border, width, font) */
  className?: string;
  invalid?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function SuggestInput({
  id,
  value,
  onValueChange,
  suggestions,
  placeholder,
  className,
  invalid,
  autoFocus,
  onBlur,
  onKeyDown,
}: SuggestInputProps) {
  return (
    <Autocomplete.Root
      items={suggestions}
      itemToStringValue={(suggestion: Suggestion) => suggestion.value}
      value={value}
      onValueChange={(next, details) => onValueChange(next, details.reason === 'item-press')}
      limit={SUGGESTION_LIMIT}
      openOnInputClick
    >
      <ComboboxInput
        id={id}
        className={cn('w-full', className)}
        showTrigger={false}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        autoFocus={autoFocus}
        spellCheck={false}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      <ComboboxContent>
        <ComboboxList>
          {(suggestion: Suggestion) => (
            <Autocomplete.Item
              key={suggestion.value}
              value={suggestion}
              className="relative flex w-full cursor-pointer items-baseline gap-2 rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            >
              <span className="min-w-0 truncate">{suggestion.value}</span>
              {suggestion.label && suggestion.label !== suggestion.value && (
                <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground">{suggestion.label}</span>
              )}
            </Autocomplete.Item>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Autocomplete.Root>
  );
}
