import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';

/** Checkbox with label and a faint explanation after it. */
export function CheckRow({
  checked,
  onChange,
  label,
  hint,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  /** Second line below the label. */
  description?: ReactNode;
}) {
  return (
    <label className={cn('flex cursor-pointer gap-2 text-sm', description ? 'items-start' : 'items-center')}>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value)} className={description ? 'mt-0.5' : undefined} />
      <span>
        {label} {hint && <span className="text-muted-foreground">{hint}</span>}
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}
