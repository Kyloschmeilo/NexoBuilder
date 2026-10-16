import { type KeyboardEvent, useMemo, useState } from 'react';
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
  /**
   * Report the text only when it is final: on picking a suggestion, on Enter or when the input loses focus (a type
   * that switches the fields below should not change on every keystroke).
   */
  commitOnBlur?: boolean;
}

/** Single-line text input with optional suggestions (a popup that only fills in the text). */
export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions,
  invalid,
  mono,
  autoFocus,
  className,
  commitOnBlur,
}: TextInputProps) {
  const choiceText = useChoiceText();
  const items = useMemo(
    () => suggestions?.map((choice) => ({ value: choice.value, label: choiceText(choice) })) ?? [],
    [suggestions, choiceText],
  );
  // The text typed since the last commit (commitOnBlur only)
  const [draft, setDraft] = useState<string | null>(null);
  const change = (text: string) => onChange(text === '' ? undefined : text);
  const commit = (text: string) => {
    setDraft(null);
    if (text !== (value ?? '')) change(text);
  };
  const type = (text: string, picked = false) => {
    if (!commitOnBlur) change(text);
    else if (picked) commit(text);
    else setDraft(text);
  };
  const finish = commitOnBlur
    ? {
        onBlur: () => {
          if (draft !== null) commit(draft);
        },
        onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' && draft !== null) commit(draft);
        },
      }
    : {};
  const shown = draft ?? value ?? '';
  if (items.length > 0) {
    return (
      <SuggestInput
        id={id}
        className={cn(mono && 'font-mono', className)}
        value={shown}
        onValueChange={type}
        suggestions={items}
        placeholder={placeholder}
        invalid={invalid}
        autoFocus={autoFocus}
        {...finish}
      />
    );
  }
  return (
    <Input
      id={id}
      className={cn(mono && 'font-mono', className)}
      aria-invalid={invalid || undefined}
      value={shown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => type(e.target.value)}
      {...finish}
      spellCheck={false}
    />
  );
}
