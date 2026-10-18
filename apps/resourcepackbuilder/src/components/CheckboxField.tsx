/**
 * An on/off setting with its label and an optional description, as a switch in front of the text (the Workbench
 * control for booleans). The name is kept for its callers; clicking the label toggles the switch.
 */
import { useId, type ReactNode } from 'react';
import { cn } from '@resourcepackbuilder/ui/cn';
import { Switch } from '@resourcepackbuilder/ui/components/switch';

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
  const descriptionId = useId();
  return (
    <div
      data-slot="switch-field"
      data-disabled={disabled || undefined}
      className={cn('flex min-w-0 items-start gap-2.5 data-disabled:opacity-60', className)}
    >
      <Switch
        id={id}
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        onCheckedChange={onChange}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className={cn('text-label font-medium text-text', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="m-0 text-meta text-text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
