/** The frame around one field editor: title (with version badge), the control, error and help text. */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import type { Field } from '@resourcepackbuilder/core/nexo/fields';
import { fieldName } from '@resourcepackbuilder/core/nexo/fieldNames';
import { compareVersions } from '@resourcepackbuilder/core/minecraft/versions';
import { Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { FieldDescription, FieldError, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { useSchemaText } from '../useSchemaText';
import { useFieldContext } from './FieldContext';

/**
 * Displayed name of a field: its original English (Nexo) name, or the translated label when there is no
 * name. The translated label is the tooltip when it differs from the name.
 */
export function useFieldTitle(field: Field): { title: string; description: string | undefined } {
  const text = useSchemaText();
  const name = fieldName(field);
  const title = name === field.label ? (text(name) ?? name) : name;
  const description = text(field.label);
  return { title, description: description !== title ? description : undefined };
}

/** Whether the project's Minecraft version is below the field's `minVersion`. */
export function useVersionTooLow(field: Field): boolean {
  const { minecraftVersion } = useFieldContext();
  return !!field.minVersion && compareVersions(minecraftVersion, field.minVersion) < 0;
}

export function MinVersionBadge({ field }: { field: Field }) {
  const t = useTranslations('ui');
  const tooLow = useVersionTooLow(field);
  if (!field.minVersion) return null;
  return (
    <Tip label={tooLow ? t('field.minVersionTooLow', { version: field.minVersion }) : undefined}>
      <Badge variant="outline" className={cn('font-mono font-normal normal-case', tooLow ? 'border-warning/50 text-warning' : 'text-muted-foreground')}>
        {t('field.minVersion', { version: field.minVersion })}
      </Badge>
    </Tip>
  );
}

/** Field name with the translated label as tooltip. */
export function FieldName({ field }: { field: Field }) {
  const { title, description } = useFieldTitle(field);
  return (
    <Tip label={description}>
      <span className="min-w-0 truncate">{title}</span>
    </Tip>
  );
}

export function FieldErrorText({ children }: { children: ReactNode }) {
  return <FieldError className="text-xs leading-4 before:content-['■_']">{children}</FieldError>;
}

interface FieldShellProps {
  field: Field;
  /** The title is omitted (the context already names the field). */
  hideLabel?: boolean;
  /** Spans the full width of the form grid. */
  wide?: boolean;
  /** Translated validation message. */
  error?: string;
  children: ReactNode;
}

export function FieldShell({ field, hideLabel, wide, error, children }: FieldShellProps) {
  const text = useSchemaText();
  const help = text(field.help);
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', wide && 'col-span-full')}>
      {!hideLabel && field.label && (
        <FieldTitle className="w-full gap-1.5 text-[13px] leading-4">
          <FieldName field={field} />
          <MinVersionBadge field={field} />
        </FieldTitle>
      )}
      {children}
      {error && <FieldErrorText>{error}</FieldErrorText>}
      {help && <FieldDescription className="text-xs leading-4">{help}</FieldDescription>}
    </div>
  );
}
