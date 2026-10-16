import { useMemo } from 'react';
import { cn } from 'cn';
import { SuggestInput } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { useChoiceText, type Choice } from './choices';

/**
 * Suggestions for an input (`<input list={id}>`) – for list rows whose Enter key adds or commits a row;
 * single inputs use {@link TextInput} with its suggestion popup.
 */
export function Datalist({ id, choices }: { id: string; choices?: readonly Choice[] }) {
  const choiceText = useChoiceText();
  if (!choices?.length) return null;
  return (
    <datalist id={id}>
      {choices.map((choice) => {
        const text = choiceText(choice);
        return (
          <option key={choice.value} value={choice.value}>
            {text !== choice.value ? text : undefined}
          </option>
        );
      })}
    </datalist>
  );
}

interface TextInputProps {
  id?: string;
  value: string | undefined;
  /** Receives undefined for an empty field. */
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  suggestions?: readonly Choice[];
  invalid?: boolean;
  mono?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/** Single-line text input with optional suggestions (a popup that only fills in the text). */
export function TextInput({ id, value, onChange, placeholder, suggestions, invalid, mono, autoFocus, className }: TextInputProps) {
  const choiceText = useChoiceText();
  const items = useMemo(
    () => suggestions?.map((choice) => ({ value: choice.value, label: choiceText(choice) })) ?? [],
    [suggestions, choiceText],
  );
  const change = (text: string) => onChange(text === '' ? undefined : text);
  if (items.length > 0) {
    return (
      <SuggestInput
        id={id}
        className={cn(mono && 'font-mono', className)}
        value={value ?? ''}
        onValueChange={change}
        suggestions={items}
        placeholder={placeholder}
        invalid={invalid}
        autoFocus={autoFocus}
      />
    );
  }
  return (
    <Input
      id={id}
      className={cn(mono && 'font-mono', className)}
      aria-invalid={invalid || undefined}
      value={value ?? ''}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => change(e.target.value)}
      spellCheck={false}
    />
  );
}
