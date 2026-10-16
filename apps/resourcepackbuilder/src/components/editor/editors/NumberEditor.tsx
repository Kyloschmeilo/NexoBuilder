import type { NumberField } from '@resourcepackbuilder/core/form';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import { NumberInput } from '../inputs/NumberInput';
import type { EditorProps } from '../types';

function outOfRange(field: NumberField, value: unknown): boolean {
  if (typeof value !== 'number') return false;
  return (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max);
}

export function NumberEditor({ field, value, onChange, hideLabel }: EditorProps<NumberField>) {
  const text = useSchemaText();
  return (
    <FieldShell field={field} hideLabel={hideLabel}>
      <NumberInput
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        onChange={onChange}
        placeholder={text(field.placeholder)}
        integer={field.integer}
        min={field.min}
        max={field.max}
        invalid={outOfRange(field, value)}
      />
    </FieldShell>
  );
}
