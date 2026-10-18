/**
 * A labelled form field for hand-written forms (media, test server) in the Workbench look: the label above the control,
 * which it wraps so a click on it focuses the input. Schema fields use `FieldShell`/`FieldRow` instead; this component
 * goes away once its callers move to `FieldRow`.
 */
import type { ReactNode } from 'react';
import { cn } from '@resourcepackbuilder/ui/cn';
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
    <Field data-slot="form-field" className={cn('min-w-0 gap-1', wide && 'col-span-full')}>
      <FieldLabel className="w-full flex-col items-stretch gap-1 font-normal">
        <Tip label={help}>
          <span
            className={cn(
              'w-fit text-label font-medium text-text',
              help && 'cursor-help underline decoration-text-faint decoration-dotted underline-offset-2',
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
    <FieldError className="text-meta text-danger">{children}</FieldError>
  ) : (
    <FieldDescription className="text-meta text-text-muted">{children}</FieldDescription>
  );
}
