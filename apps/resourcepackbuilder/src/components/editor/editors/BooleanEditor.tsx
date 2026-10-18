/** A boolean field as a switch; outside a property's top level it can also be left unset (the plugin's default). */
import { useId } from 'react';
import type { BooleanField } from '@resourcepackbuilder/core/form';
import { FieldShell, useFieldLabel } from '../FieldShell';
import { BooleanSwitch } from '../inputs/BooleanSwitch';
import type { EditorProps } from '../types';

export function BooleanEditor({ field, value, onChange, root, hideLabel }: EditorProps<BooleanField>) {
  const id = useId();
  const label = useFieldLabel(field);
  return (
    <FieldShell field={field} hideLabel={hideLabel} htmlFor={id}>
      <BooleanSwitch
        id={id}
        aria-label={hideLabel ? label : undefined}
        value={typeof value === 'boolean' ? value : undefined}
        onChange={onChange}
        allowUnset={!root}
        defaultHint={field.defaultHint}
      />
    </FieldShell>
  );
}
