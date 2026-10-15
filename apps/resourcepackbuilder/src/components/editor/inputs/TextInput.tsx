import { useId } from 'react';
import { cn } from 'cn';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { useChoiceText, type Choice } from './choices';

/** Suggestions for an input (`<input list={id}>`). */
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

/** Single-line text input with optional suggestions. */
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
      <Datalist id={listId} choices={suggestions} />
    </>
  );
}
