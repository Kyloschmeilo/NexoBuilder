/**
 * One field of a form in the Workbench layout: label | control | key rail. The label column carries the docs link,
 * the ⓘ help and badges; the key rail shows the field's YAML key in mono. Errors and warnings sit below the control.
 * In a narrow container, or with `layout="stacked"`, the label (with the key beside it) sits above the control.
 */
import { useId, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from 'cn';
import { IconButton } from '../IconButton';
import { useUiLabels } from '../labels';
import { DocsLink, type DocsRef } from './DocsLink';
import { Help } from './Help';

/** Whether a field has a value of its own (`set`), takes one from elsewhere (`inherited`), or neither. */
export type FieldState = 'default' | 'set' | 'inherited';

export interface FieldRowProps {
  /** The translated human label. Without one the control takes the whole row (e.g. a value inside a list). */
  label?: ReactNode;
  /** Id of the control the label is for; without it the control column is a group labelled by the label. */
  htmlFor?: string;
  /** Help content: shown in the ⓘ popover beside the label, or as a muted line below the control with `helpInline`. */
  help?: ReactNode;
  /** Prints the help below the control. Keep it for the few fields where the hint is essential (MiniMessage syntax). */
  helpInline?: boolean;
  /** The plugin's YAML key of the field, shown in the key rail. */
  yamlKey?: string;
  /** Link to the field's docs page; the icon is tinted by the target. The topic defaults to a string label. */
  docs?: DocsRef & { label?: string };
  /** Shown after the label (version or premium badges). */
  badges?: ReactNode;
  /** `set` marks the label with an accent dot, `inherited` with an outlined one. */
  state?: FieldState;
  /** Translated validation error, shown in red below the control; the control gets a red border. */
  error?: string;
  /** Translated warning, shown below the control. */
  warning?: string;
  /** Shows a "Reset to default" button while the row is hovered or focused. */
  onReset?: () => void;
  /** `side` (default) puts label, control and key in columns once the row is wide enough; `stacked` always stacks. */
  layout?: 'side' | 'stacked';
  className?: string;
  children: ReactNode;
}

/** The key in mono, faint; it truncates, with the full key as tooltip. */
function YamlKey({ yamlKey, className }: { yamlKey: string; className?: string }) {
  return (
    <code data-slot="yaml-key" title={yamlKey} className={cn('min-w-0 truncate font-mono text-micro text-text-faint', className)}>
      {yamlKey}
    </code>
  );
}

/** Red border on the control of a row with an error (the row cannot set `aria-invalid` on its child). */
const INVALID_CONTROL = '[&_:is(input,textarea,select,[data-slot=select-trigger],[data-slot=combobox-trigger])]:border-danger';

/** A form field row in the Workbench layout. */
export function FieldRow({
  label,
  htmlFor,
  help,
  helpInline,
  yamlKey,
  docs,
  badges,
  state = 'default',
  error,
  warning,
  onReset,
  layout = 'side',
  className,
  children,
}: FieldRowProps) {
  const labels = useUiLabels();
  const labelId = useId();
  const isSide = layout === 'side';
  const hasLabel = label !== undefined && label !== null && label !== '';
  const LabelTag = htmlFor ? 'label' : 'span';
  const isGroup = hasLabel && !htmlFor;
  return (
    <div
      data-slot="field-row"
      data-layout={layout}
      data-state={state}
      data-invalid={error ? true : undefined}
      className={cn('group/field @container/field min-w-0', className)}
    >
      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)] gap-x-3 gap-y-1',
          isSide && hasLabel && '@md/field:grid-cols-[11rem_minmax(0,1fr)_8.5rem]',
          isSide && !hasLabel && yamlKey && '@md/field:grid-cols-[minmax(0,1fr)_8.5rem]',
        )}
      >
        {hasLabel && (
          <div className={cn('relative flex min-h-6 min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5', isSide && '@md/field:min-h-7.5')}>
            {state !== 'default' && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-1/2 -left-3 size-1.5 -translate-y-1/2 rounded-full',
                  state === 'set' ? 'bg-primary' : 'border border-primary',
                )}
              />
            )}
            <LabelTag id={labelId} htmlFor={htmlFor} className="min-w-0 text-label font-medium break-words text-text">
              {label}
            </LabelTag>
            {yamlKey && <YamlKey yamlKey={yamlKey} className={cn(isSide && '@md/field:hidden')} />}
            {docs && <DocsLink url={docs.url} target={docs.target} label={docs.label ?? (typeof label === 'string' ? label : undefined)} />}
            {help && !helpInline && <Help>{help}</Help>}
            {badges}
            {onReset && (
              <IconButton
                label={labels.resetToDefault}
                size="icon-xs"
                className="opacity-0 group-focus-within/field:opacity-100 group-hover/field:opacity-100"
                onClick={onReset}
              >
                <RotateCcw />
              </IconButton>
            )}
          </div>
        )}
        <div
          role={isGroup ? 'group' : undefined}
          aria-labelledby={isGroup ? labelId : undefined}
          className={cn('flex min-w-0 flex-col gap-1', error && INVALID_CONTROL)}
        >
          {children}
          {error && <p className="m-0 text-meta text-danger">{error}</p>}
          {warning && <p className="m-0 text-meta text-warning">{warning}</p>}
          {help && helpInline && <p className="m-0 text-meta text-text-muted">{help}</p>}
        </div>
        {isSide && yamlKey && (
          <div className="hidden min-w-0 justify-end pt-2 @md/field:flex">
            <YamlKey yamlKey={yamlKey} />
          </div>
        )}
        {isSide && hasLabel && !yamlKey && <div className="hidden @md/field:block" aria-hidden />}
      </div>
    </div>
  );
}
