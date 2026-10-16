/**
 * A value that takes one of several forms (e.g. a CraftEngine loot table: a template, a table or an id): a segmented
 * control picks the form, and that form's field edits the value. Switching to another form and back in the same
 * editor brings the earlier value back.
 */
import { useRef, useState } from 'react';
import { type ChoiceField, findChoice } from '@resourcepackbuilder/core/form';
import { SegmentedControl } from '@resourcepackbuilder/ui';
import { useSchemaText } from '../../useSchemaText';
import { FieldRenderer } from '../FieldRenderer';
import { FieldShell } from '../FieldShell';
import type { EditorProps } from '../types';

export function ChoiceEditor({ field, value, onChange, hideLabel }: EditorProps<ChoiceField>) {
  const text = useSchemaText();
  const matched = findChoice(field, value);
  // While the value has no form (unset, or emptied), the form it had or was picked last stays
  const [picked, setPicked] = useState(matched?.id ?? field.choices[0].id);
  if (matched && matched.id !== picked) setPicked(matched.id);
  const earlier = useRef(new Map<string, unknown>());
  const active = matched ?? field.choices.find((choice) => choice.id === picked) ?? field.choices[0];
  const pick = (id: string) => {
    const next = field.choices.find((choice) => choice.id === id);
    if (!next || next === active) return;
    if (matched) earlier.current.set(active.id, value);
    setPicked(id);
    onChange(earlier.current.get(id) ?? next.newValue());
  };
  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <div className="flex flex-col gap-2.5">
        <SegmentedControl
          size="sm"
          className="self-start"
          value={active.id}
          onChange={pick}
          options={field.choices.map((choice) => ({ value: choice.id, label: text(choice.label) }))}
        />
        {/* The form's object shows its fields directly, as the control above already frames it */}
        <FieldRenderer field={active.field} value={matched ? value : undefined} root onChange={onChange} />
      </div>
    </FieldShell>
  );
}
