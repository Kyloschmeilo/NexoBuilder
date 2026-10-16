import type { BooleanField } from '@resourcepackbuilder/core/nexo';
import { FieldShell } from '../FieldShell';
import { TriState } from '../inputs/TriState';
import type { EditorProps } from '../types';

export function BooleanEditor({ field, value, onChange, root, hideLabel }: EditorProps<BooleanField>) {
  return (
    <FieldShell field={field} hideLabel={hideLabel}>
      <TriState
        value={typeof value === 'boolean' ? value : undefined}
        onChange={onChange}
        allowUnset={!root}
        defaultHint={field.defaultHint}
      />
    </FieldShell>
  );
}
