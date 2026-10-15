import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Tip } from '@resourcepackbuilder/ui';
import { Field, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';

/** Labelled form field; the label wraps the control so clicking it focuses the input. */
export function FormField({
  label,
  help,
  description,
  wide,
  children,
}: {
  label: ReactNode;
  /** Short explanation shown on hover over the label. */
  help?: string;
  description?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <Field className={cn('min-w-0 gap-1.5', wide && 'col-span-full')}>
      <FieldLabel className="w-full flex-col items-stretch gap-1.5 font-normal">
        <Tip label={help}>
          <span
            className={cn(
              'w-fit text-xs font-medium text-muted-foreground',
              help && 'cursor-help underline decoration-dotted underline-offset-2',
            )}
          >
            {label}
          </span>
        </Tip>
        {children}
      </FieldLabel>
      {description}
    </Field>
  );
}

/** Help text below a {@link FormField}'s control. */
export function FormHelp({ children, error }: { children: ReactNode; error?: boolean }) {
  return <FieldDescription className={cn('text-xs', error && 'text-destructive')}>{children}</FieldDescription>;
}

/** Responsive grid of {@link FormField}s. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] gap-4', className)}>{children}</div>;
}
