import type { SelectField } from '@resourcepackbuilder/core/nexo';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import { SelectInput } from '../inputs/SelectInput';
import type { EditorProps } from '../types';

export function SelectEditor({ field, value, onChange, hideLabel }: EditorProps<SelectField>) {
  const text = useSchemaText();
  return (
    <FieldShell field={field} hideLabel={hideLabel}>
      <SelectInput
        value={typeof value === 'string' ? value : undefined}
        onChange={onChange}
        options={field.options}
        allowCustom={field.allowCustom}
        placeholder={text(field.placeholder)}
      />
    </FieldShell>
  );
}
