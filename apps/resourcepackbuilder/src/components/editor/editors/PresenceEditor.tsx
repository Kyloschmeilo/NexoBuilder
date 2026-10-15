import type { PresenceField } from '@resourcepackbuilder/core/nexo/fields';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { CheckboxField } from '../../CheckboxField';
import { useSchemaText } from '../../useSchemaText';
import { FieldName } from '../FieldShell';
import type { EditorProps } from '../types';

/** A checkbox that writes `{}` when checked (e.g. CLEAR_ALL_EFFECTS). */
export function PresenceEditor({ field, value, onChange }: EditorProps<PresenceField>) {
  const text = useSchemaText();
  return (
    <CheckboxField
      className="col-span-full py-1.5"
      checked={isPlainObject(value) || value === true}
      onChange={(checked) => onChange(checked ? {} : undefined)}
      label={<FieldName field={field} />}
      description={text(field.help)}
    />
  );
}
