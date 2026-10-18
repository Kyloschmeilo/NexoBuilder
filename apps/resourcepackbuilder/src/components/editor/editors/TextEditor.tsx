/**
 * A text field. The format picks the control: three x/y/z inputs for a vector, a mono input with a picker of the
 * project's resources for a resource id, a colour picker beside "R, G, B" text, and a rendered preview chip below
 * MiniMessage text.
 */
import { useId } from 'react';
import { type TextField, validateTextFormat } from '@resourcepackbuilder/core/form';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import { ColorInput } from '../inputs/ColorInput';
import { MiniMessageChip } from '../inputs/MiniMessageChip';
import { ResourceIdInput } from '../inputs/ResourceIdInput';
import { TextInput } from '../inputs/TextInput';
import { Vector3Input } from '../inputs/Vector3Input';
import type { EditorProps } from '../types';

/** Numbers and booleans written where text is expected are shown as text. */
function asText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'string' ? value : String(value);
}

export function TextEditor({ field, value, onChange, hideLabel }: EditorProps<TextField>) {
  const id = useId();
  const text = useSchemaText();
  const textValue = asText(value);
  const error = text(textValue ? (validateTextFormat(field.format, textValue) ?? undefined) : undefined);
  const placeholder = text(field.placeholder);

  const control = () => {
    if (field.multiline) {
      return <Textarea id={id} value={textValue ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value || undefined)} />;
    }
    if (field.format === 'vector') return <Vector3Input id={id} value={value} onChange={onChange} placeholder={placeholder} />;
    if (field.format === 'resource') {
      return (
        <ResourceIdInput
          id={id}
          value={textValue}
          onChange={onChange}
          placeholder={placeholder}
          suggestions={field.suggestions}
          invalid={!!error}
        />
      );
    }
    const input = (
      <TextInput
        id={id}
        className={field.format === 'color' ? 'min-w-0 flex-1' : undefined}
        value={textValue}
        onChange={onChange}
        placeholder={placeholder}
        suggestions={field.suggestions}
        invalid={!!error}
      />
    );
    if (field.format !== 'color') return input;
    return (
      <div className="flex min-w-0 items-start gap-1.5">
        {input}
        <ColorInput value={textValue} onChange={onChange} />
      </div>
    );
  };

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide={field.multiline} error={error} htmlFor={id}>
      {control()}
      {field.format === 'minimessage' && textValue && <MiniMessageChip text={textValue} />}
    </FieldShell>
  );
}
