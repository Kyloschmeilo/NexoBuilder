/** Building blocks shared by the sounds, paintings, glyphs and test-server views. */
import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Tooltip, TooltipContent, TooltipTrigger } from '@resourcepackbuilder/ui/components/tooltip';

/** Centred, scrollable page body of a resource view. */
export function ViewShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-8 pt-6 pb-16">{children}</div>;
}

/** Icon tile, title with meta badges and optional actions on the right. */
export function ViewHeader({
  icon,
  title,
  meta,
  actions,
  iconClassName,
}: {
  icon: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  iconClassName?: string;
}) {
  return (
    <div className="mb-1 flex items-center gap-4">
      <div
        className={cn(
          'grid size-16 flex-none place-items-center overflow-hidden rounded-md border border-border bg-card text-muted-foreground',
          iconClassName,
        )}
      >
        {icon}
      </div>
      <div className="min-w-[200px] flex-1">
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-foreground">{title}</h1>
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
    </div>
  );
}

/** Explanatory text block; `warning` draws attention with the warning colour. */
export function Hint({ children, warning, className }: { children: ReactNode; warning?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm leading-relaxed [&>svg]:mt-0.5 [&>svg]:flex-none',
        warning ? 'border-warning text-foreground [&>svg]:text-warning' : 'border-border bg-muted/50 text-muted-foreground [&>svg]:text-info',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Inline code inside prose. */
export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>;
}

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
        <span
          title={help}
          className={cn('w-fit text-xs font-medium text-muted-foreground', help && 'cursor-help underline decoration-dotted underline-offset-2')}
        >
          {label}
        </span>
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
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4', className)}>{children}</div>;
}

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

/** Icon-only button with a tooltip. */
export function IconAction({
  label,
  onClick,
  destructive,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={destructive ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : undefined}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
