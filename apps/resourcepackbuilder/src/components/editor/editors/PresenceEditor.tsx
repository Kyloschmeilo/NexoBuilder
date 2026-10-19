/** A switch that writes `{}` while on and nothing while off (e.g. CLEAR_ALL_EFFECTS). */
import { useId } from 'react';
import type { PresenceField } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { Switch } from '@resourcepackbuilder/ui/components/switch';
import { FieldShell, useFieldLabel } from '../FieldShell';
import type { EditorProps } from '../types';

export function PresenceEditor({ field, value, onChange, hideLabel }: EditorProps<PresenceField>) {
  const id = useId();
  const label = useFieldLabel(field);
  return (
    <FieldShell field={field} hideLabel={hideLabel} htmlFor={id}>
      <div className="flex min-h-7.5 items-center">
        <Switch
          id={id}
          aria-label={hideLabel ? label : undefined}
          checked={isPlainObject(value) || value === true}
          onCheckedChange={(checked) => onChange(checked ? {} : undefined)}
        />
      </div>
    </FieldShell>
  );
}
