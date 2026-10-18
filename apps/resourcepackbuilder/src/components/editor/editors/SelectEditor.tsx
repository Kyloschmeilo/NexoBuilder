/** A select field: segments, a select or a searchable combobox depending on the number of options (see SelectInput). */
import { useId } from 'react';
import type { SelectField } from '@resourcepackbuilder/core/form';
import { useSchemaText } from '../../useSchemaText';
import { useFieldContext } from '../fieldContext';
import { FieldShell, useFieldLabel } from '../FieldShell';
import { SelectInput } from '../inputs/SelectInput';
import type { EditorProps } from '../types';

export function SelectEditor({ field, value, onChange, hideLabel }: EditorProps<SelectField>) {
  const id = useId();
  const text = useSchemaText();
  const label = useFieldLabel(field);
  const { dynamicSuggestions } = useFieldContext();
  const projectOptions = field.dynamicSuggestions ? dynamicSuggestions?.[field.dynamicSuggestions] : undefined;
  const options = projectOptions?.length ? [...field.options, ...projectOptions] : field.options;
  return (
    <FieldShell field={field} hideLabel={hideLabel} htmlFor={id}>
      <SelectInput
        id={id}
        aria-label={hideLabel ? label : undefined}
        value={typeof value === 'string' ? value : undefined}
        onChange={onChange}
        options={options}
        allowCustom={field.allowCustom}
        placeholder={text(field.placeholder)}
      />
    </FieldShell>
  );
}
