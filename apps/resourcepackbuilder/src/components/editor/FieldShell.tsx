/**
 * The frame around one field editor of the form schema, as a thin adapter onto the ui `FieldRow`: the translated label,
 * the field's YAML key in the key rail, the docs link of the project's target, the version badge, help in the ⓘ
 * popover and the validation error below the control.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import { type Field, fieldName } from '@resourcepackbuilder/core/form';
import { compareVersions } from '@resourcepackbuilder/minecraft';
import { FieldRow, Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { useFormTarget } from '../formTarget';
import { useSchemaText } from '../useSchemaText';
import { useFieldContext } from './fieldContext';

/** The YAML key a field writes, shown in the key rail; none for the remaining keys of a map (`*`) or unnamed values. */
export function fieldYamlKey(field: Pick<Field, 'key'>): string | undefined {
  return field.key && field.key !== '*' ? field.key : undefined;
}

/** Displayed label of a field: the translated label, or the plugin's English name when the field has no label. */
export function useFieldLabel(field: Field): string {
  const text = useSchemaText();
  return text(field.label) ?? fieldName(field);
}

/** Whether the project's Minecraft version is below the field's `minVersion`. */
export function useVersionTooLow(field: Field): boolean {
  const { minecraftVersion } = useFieldContext();
  return !!field.minVersion && compareVersions(minecraftVersion, field.minVersion) < 0;
}

/** "from 1.21.4" next to a field that needs a newer Minecraft version; tinted when the project's version is too low. */
export function MinVersionBadge({ field }: { field: Field }) {
  const t = useTranslations('editor');
  const tooLow = useVersionTooLow(field);
  if (!field.minVersion) return null;
  return (
    <Tip label={tooLow ? t('field.minVersionTooLow', { version: field.minVersion }) : undefined}>
      <Badge
        variant="outline"
        className={cn('font-mono font-normal normal-case', tooLow ? 'border-warning/50 text-warning' : 'text-muted-foreground')}
      >
        {t('field.minVersion', { version: field.minVersion })}
      </Badge>
    </Tip>
  );
}

interface FieldShellProps {
  field: Field;
  /** The label is omitted (the context already names the field); help then shows below the control. */
  hideLabel?: boolean;
  /** Stacks the label above the control, for controls that need the width (lists, maps, YAML, long text). */
  wide?: boolean;
  /** Translated validation message. */
  error?: string;
  /** Id of the control, so the label names it and a click on the label focuses it. */
  htmlFor?: string;
  children: ReactNode;
}

/** A schema field as a `FieldRow`. */
export function FieldShell({ field, hideLabel, wide, error, htmlFor, children }: FieldShellProps) {
  const text = useSchemaText();
  const label = useFieldLabel(field);
  const target = useFormTarget();
  const help = text(field.help);
  const hasLabel = !hideLabel && !!field.label;
  return (
    <FieldRow
      label={hasLabel ? label : undefined}
      htmlFor={hasLabel ? htmlFor : undefined}
      yamlKey={hasLabel ? fieldYamlKey(field) : undefined}
      docs={hasLabel && field.docs && target ? { url: field.docs, target, label } : undefined}
      badges={hasLabel && <MinVersionBadge field={field} />}
      help={help}
      helpInline={!hasLabel}
      error={error}
      layout={wide ? 'stacked' : 'side'}
    >
      {children}
    </FieldRow>
  );
}
