import { useId, type ReactNode } from 'react';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';

/** Checkbox with label and optional description, laid out as a horizontal shadcn field. */
export function CheckboxField({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <Field orientation="horizontal" data-disabled={disabled || undefined} className={className}>
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description && <FieldDescription className="text-xs">{description}</FieldDescription>}
      </FieldContent>
    </Field>
  );
}
