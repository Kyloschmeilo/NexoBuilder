import { type TextField, validateTextFormat } from '@resourcepackbuilder/core/form';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { MiniMessageBox } from '../../miniMessage/MiniMessageBox';
import { MiniMessageLine } from '../../miniMessage/MiniMessageLine';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import { ColorInput } from '../inputs/ColorInput';
import { TextInput } from '../inputs/TextInput';
import type { EditorProps } from '../types';

/** Numbers and booleans written where text is expected are shown as text. */
function asText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'string' ? value : String(value);
}

export function TextEditor({ field, value, onChange, hideLabel }: EditorProps<TextField>) {
  const text = useSchemaText();
  const textValue = asText(value);
  const error = text(textValue ? (validateTextFormat(field.format, textValue) ?? undefined) : undefined);
  const placeholder = text(field.placeholder);
  return (
    <FieldShell field={field} hideLabel={hideLabel} wide={field.multiline} error={error}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {field.multiline ? (
            <Textarea value={textValue ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value || undefined)} />
          ) : (
            <TextInput value={textValue} onChange={onChange} placeholder={placeholder} suggestions={field.suggestions} invalid={!!error} />
          )}
        </div>
        {field.format === 'color' && <ColorInput value={textValue} onChange={onChange} />}
      </div>
      {field.format === 'minimessage' && textValue && (
        <MiniMessageBox className="min-w-0">
          <MiniMessageLine text={textValue} />
        </MiniMessageBox>
      )}
    </FieldShell>
  );
}
