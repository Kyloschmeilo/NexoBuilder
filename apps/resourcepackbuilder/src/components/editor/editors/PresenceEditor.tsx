import type { PresenceField } from '@resourcepackbuilder/core/nexo/fields';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Label } from '@resourcepackbuilder/ui/components/label';
import { useSchemaText } from '../../useSchemaText';
import { FieldName } from '../FieldShell';
import type { EditorProps } from '../types';

/** A checkbox that writes `{}` when checked (e.g. CLEAR_ALL_EFFECTS). */
export function PresenceEditor({ field, value, onChange }: EditorProps<PresenceField>) {
  const text = useSchemaText();
  const help = text(field.help);
  return (
    <Label className="col-span-full cursor-pointer items-start gap-2.5 py-1.5 text-sm leading-5 font-normal">
      <Checkbox
        className="mt-0.5"
        checked={isPlainObject(value) || value === true}
        onCheckedChange={(checked) => onChange(checked ? {} : undefined)}
      />
      <span className="flex min-w-0 flex-col">
        <FieldName field={field} />
        {help && <span className="text-xs leading-4 text-muted-foreground">{help}</span>}
      </span>
    </Label>
  );
}
