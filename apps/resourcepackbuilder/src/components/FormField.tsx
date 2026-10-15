import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Tip } from '@resourcepackbuilder/ui';
import { Field, FieldDescription, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';

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
  return error ? (
    <FieldError className="text-xs">{children}</FieldError>
  ) : (
    <FieldDescription className="text-xs">{children}</FieldDescription>
  );
}
