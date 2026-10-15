import type { TextField } from '@resourcepackbuilder/core/nexo/fields';
import { validateTextFormat } from '@resourcepackbuilder/core/nexo/fieldFormat';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { MiniMessageBox, MiniMessageLine } from '../../MiniMessage';
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
  const str = asText(value);
  const error = text(str ? (validateTextFormat(field.format, str) ?? undefined) : undefined);
  const placeholder = text(field.placeholder);
  return (
    <FieldShell field={field} hideLabel={hideLabel} wide={field.multiline} error={error}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {field.multiline ? (
            <Textarea value={str ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value || undefined)} />
          ) : (
            <TextInput value={str} onChange={onChange} placeholder={placeholder} suggestions={field.suggestions} invalid={!!error} />
          )}
        </div>
        {field.format === 'color' && <ColorInput value={str} onChange={onChange} />}
      </div>
      {field.format === 'minimessage' && str && (
        <MiniMessageBox className="min-w-0">
          <MiniMessageLine text={str} />
        </MiniMessageBox>
      )}
    </FieldShell>
  );
}
