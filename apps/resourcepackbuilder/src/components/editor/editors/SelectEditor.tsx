import type { SelectField } from '@resourcepackbuilder/core/form';
import { useSchemaText } from '../../useSchemaText';
import { useFieldContext } from '../fieldContext';
import { FieldShell } from '../FieldShell';
import { SelectInput } from '../inputs/SelectInput';
import type { EditorProps } from '../types';

export function SelectEditor({ field, value, onChange, hideLabel }: EditorProps<SelectField>) {
  const text = useSchemaText();
  const { dynamicSuggestions } = useFieldContext();
  const projectOptions = field.dynamicSuggestions ? dynamicSuggestions?.[field.dynamicSuggestions] : undefined;
  const options = projectOptions?.length ? [...field.options, ...projectOptions] : field.options;
  return (
    <FieldShell field={field} hideLabel={hideLabel}>
      <SelectInput
        value={typeof value === 'string' ? value : undefined}
        onChange={onChange}
        options={options}
        allowCustom={field.allowCustom}
        placeholder={text(field.placeholder)}
      />
    </FieldShell>
  );
}
