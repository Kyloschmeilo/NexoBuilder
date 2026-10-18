/** A number field: the input keeps partial typing, the arrow keys step by the field's `step`, out-of-range is marked. */
import { useId } from 'react';
import type { NumberField } from '@resourcepackbuilder/core/form';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell, useFieldLabel } from '../FieldShell';
import { NumberInput } from '../inputs/NumberInput';
import type { EditorProps } from '../types';

function outOfRange(field: NumberField, value: unknown): boolean {
  if (typeof value !== 'number') return false;
  return (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max);
}

export function NumberEditor({ field, value, onChange, hideLabel }: EditorProps<NumberField>) {
  const id = useId();
  const text = useSchemaText();
  const label = useFieldLabel(field);
  return (
    <FieldShell field={field} hideLabel={hideLabel} htmlFor={id}>
      <NumberInput
        id={id}
        label={hideLabel ? label : undefined}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        onChange={onChange}
        placeholder={text(field.placeholder)}
        integer={field.integer}
        min={field.min}
        max={field.max}
        step={field.step}
        invalid={outOfRange(field, value)}
      />
    </FieldShell>
  );
}
