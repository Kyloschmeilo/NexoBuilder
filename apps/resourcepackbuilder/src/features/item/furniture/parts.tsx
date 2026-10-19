/**
 * Small building blocks the furniture editors of both targets share: the heading of a group inside the furniture
 * section, a schema field as a collapsed feature row, and the summary words of a field's value.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Trash2 } from 'lucide-react';
import type { Field } from '@resourcepackbuilder/core/form';
import { toYaml } from '@resourcepackbuilder/core/yaml';
import { compareVersions } from '@resourcepackbuilder/minecraft';
import { DocsLink, type DocsTarget, Help, type MenuEntry, StatusPill } from '@resourcepackbuilder/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@resourcepackbuilder/ui/components/select';
import { FieldRenderer } from '../../../components/editor';
import { useFieldContext } from '../../../components/editor/fieldContext';
import { BooleanSwitch } from '../../../components/editor/inputs/BooleanSwitch';
import { NumberInput } from '../../../components/editor/inputs/NumberInput';
import { featureSummary, FeatureRow, type SummaryText } from '../../../components/features';
import { useFormTarget } from '../../../components/formTarget';
import { useSchemaText } from '../../../components/useSchemaText';

/**
 * The heading of a group inside the furniture section (Hitboxes, Behaviors …): a small title with an optional count,
 * docs link and actions on the right. Groups are spaced apart, not boxed, so the section never nests panels deeper
 * than one level.
 */
export function GroupHeading({
  title,
  count,
  docs,
  actions,
  help,
  id,
}: {
  title: string;
  count?: number;
  /** Shown in the ⓘ popover next to the title. */
  help?: string;
  docs?: { url: string; target: DocsTarget };
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex min-h-7.5 items-center gap-1.5">
      <h3 id={id} className="m-0 truncate text-label font-semibold text-text">
        {title}
      </h3>
      {count !== undefined && count > 0 && <span className="text-meta text-text-muted tabular-nums">{count}</span>}
      {help && <Help>{help}</Help>}
      {docs && <DocsLink url={docs.url} target={docs.target} label={title} />}
      {actions && <div className="ml-auto flex items-center gap-1">{actions}</div>}
    </div>
  );
}

/** A group of the furniture section: its heading and content. */
export function FurnitureGroup({ children, ...heading }: Parameters<typeof GroupHeading>[0] & { children: ReactNode }) {
  return (
    <div data-slot="furniture-group" className="flex min-w-0 flex-col gap-2">
      <GroupHeading {...heading} />
      {children}
    </div>
  );
}

/** The words of a value summary in the open locale. */
export function useSummaryText(): SummaryText {
  const t = useTranslations('editor.feature');
  const text = useSchemaText();
  return {
    on: t('on'),
    off: t('off'),
    notSet: t('notSet'),
    entries: (count) => t('entries', { count }),
    option: (key) => text(key),
  };
}

interface FieldFeatureRowProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Removes the key; the menu offers it when given. */
  onRemove?: () => void;
  /** The YAML path shown in the key rail; the field's key by default. */
  yamlKey?: string;
  /** A label of the app's own instead of the field's. */
  label?: string;
  /** A summary of the caller's own instead of the generic one. */
  summary?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A field of an object (a furniture key) as a feature row: label, value summary, key, docs link and the version pill.
 * Booleans and numbers are edited in the row; other fields expand to their editor.
 */
export function FieldFeatureRow({ field, value, onChange, onRemove, yamlKey, label, summary, open, onOpenChange }: FieldFeatureRowProps) {
  const t = useTranslations('editor.feature');
  const tCatalog = useTranslations('editor.catalog');
  const text = useSchemaText();
  const target = useFormTarget();
  const { minecraftVersion } = useFieldContext();
  const summaryText = useSummaryText();
  const name = label ?? text(field.label) ?? field.key;
  const tooOld = !!field.minVersion && compareVersions(minecraftVersion, field.minVersion) < 0;
  const key = yamlKey ?? field.key;

  let control: ReactNode = null;
  if (field.type === 'boolean') {
    control = (
      <BooleanSwitch
        aria-label={name}
        value={typeof value === 'boolean' ? value : undefined}
        defaultHint={field.defaultHint}
        onChange={onChange}
      />
    );
  } else if (field.type === 'number') {
    control = (
      <NumberInput
        label={name}
        className="w-28 font-mono"
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        onChange={onChange}
        integer={field.integer}
        min={field.min}
        max={field.max}
        step={field.step}
      />
    );
  }

  const menu: MenuEntry[] = [
    {
      icon: <Copy />,
      label: t('copyYaml'),
      onSelect: () => void navigator.clipboard?.writeText(toYaml({ [field.key]: value ?? null })),
    },
    ...(onRemove ? (['separator', { icon: <Trash2 />, label: t('remove'), destructive: true, onSelect: onRemove }] as MenuEntry[]) : []),
  ];

  return (
    <FeatureRow
      featureId={key}
      label={name}
      summary={summary ?? featureSummary(field, value, summaryText)}
      yamlKey={key}
      docs={field.docs && target ? { url: field.docs, target } : undefined}
      badges={
        field.minVersion && tooOld ? (
          <StatusPill tone="warning" label={tCatalog('fromVersion', { version: field.minVersion })} />
        ) : undefined
      }
      control={control ?? undefined}
      menu={menu}
      open={open}
      onOpenChange={onOpenChange}
    >
      {!control && <FieldRenderer field={field} value={value} root hideLabel={field.type !== 'object'} onChange={onChange} />}
    </FeatureRow>
  );
}

/**
 * A select of a value that is always set (an element's or hitbox's type): no "not set" entry, and a value outside the
 * options (written in the YAML) stays listed as it is.
 */
export function TypeSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; text: string }>;
  onChange: (value: string) => void;
}) {
  const items = options.some((o) => o.value === value) ? options : [{ value, text: value }, ...options];
  return (
    <Select<string>
      items={items.map((o) => ({ value: o.value, label: o.text }))}
      value={value}
      onValueChange={(next) => next && onChange(next)}
    >
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
