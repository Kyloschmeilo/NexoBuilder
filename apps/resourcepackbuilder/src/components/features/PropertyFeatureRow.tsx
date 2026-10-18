/**
 * A form property as a {@link FeatureRow}: translated label, value summary, YAML path, docs link tinted by the form's
 * target, Premium and version pills, the worst issue, and Reset, Copy YAML and Remove in the `⋯` menu. A boolean or a
 * single number is edited right in the row; every other property expands to its fields (with "More options" for the
 * advanced ones) and a muted line of notes. Expansion can live in the ui store (`expansionKey`), so it survives
 * switching items; `expandFeature` opens a feature that was just added.
 */
import { useTranslations } from 'next-intl';
import { Copy, RotateCcw, Trash2 } from 'lucide-react';
import { type PropertyDef, propertyYamlPath } from '@resourcepackbuilder/core/form';
import { toConfigValue } from '@resourcepackbuilder/core/project';
import { toYaml } from '@resourcepackbuilder/core/yaml';
import { versionSupport } from '@resourcepackbuilder/minecraft';
import { type MenuEntry, StatusPill } from '@resourcepackbuilder/ui';
import { setFeatureExpanded, useUiStore } from '../../store/ui';
import { FieldRenderer } from '../editor';
import { BooleanSwitch } from '../editor/inputs/BooleanSwitch';
import { NumberInput } from '../editor/inputs/NumberInput';
import { useFormTarget } from '../formTarget';
import { useSchemaText } from '../useSchemaText';
import { featureSummary } from './featureSummary';
import { type FeatureIssue, FeatureNotes, FeatureRow } from './FeatureRow';

/** The ui store key of a feature's expansion: `<owner id>/<property id>`. */
export const featureExpansionKey = (ownerId: string, propertyId: string): string => `${ownerId}/${propertyId}`;

/** Opens a feature's row (call it right after adding the feature, so the new one shows its fields). */
export function expandFeature(ownerId: string, propertyId: string): void {
  setFeatureExpanded(featureExpansionKey(ownerId, propertyId), true);
}

/** Whether a property is edited right in its row: a top-level boolean or number. */
export function isInlineProperty(def: PropertyDef): boolean {
  return def.field.type === 'boolean' || def.field.type === 'number';
}

export interface PropertyFeatureRowProps {
  def: PropertyDef;
  value: unknown;
  /** Receives the new value; Reset passes the property's default value. */
  onChange: (value: unknown) => void;
  onRemove: () => void;
  /** Translated problems of the value; the first error (else the first warning) is shown in the row. */
  issues?: readonly FeatureIssue[];
  /** The project's Minecraft version, for the version pills and notes. */
  version?: string;
  /** Keeps the expansion in the ui store under this key (see {@link featureExpansionKey}). */
  expansionKey?: string;
  /** Controlled expansion instead of the store. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Wraps a value under its YAML path for "Copy YAML". */
function yamlOf(def: PropertyDef, value: unknown): string {
  const path = def.storage === 'config' ? def.path : [def.id];
  return toYaml(path.reduceRight<unknown>((inner, key) => ({ [key]: inner }), value));
}

/** A property of the item editor as a feature row. Needs a `FieldContext` above it, like every field editor. */
export function PropertyFeatureRow({
  def,
  value,
  onChange,
  onRemove,
  issues = [],
  version,
  expansionKey,
  open,
  onOpenChange,
}: PropertyFeatureRowProps) {
  const t = useTranslations('editor.feature');
  const tCatalog = useTranslations('editor.catalog');
  const text = useSchemaText();
  const target = useFormTarget();
  const storedOpen = useUiStore((s) => (expansionKey ? s.expandedFeatures[expansionKey] : undefined));
  const label = text(def.label);
  const support = version ? versionSupport(version, def) : 'supported';
  const issue = issues.find((i) => i.tone === 'error') ?? issues[0];

  const summary = featureSummary(def.field, value, {
    on: t('on'),
    off: t('off'),
    notSet: t('notSet'),
    entries: (count) => t('entries', { count }),
    option: (key) => text(key),
  });

  const badges = (
    <>
      {def.badge === 'premium' && <StatusPill tone="info" label={tCatalog('premium')} />}
      {def.minVersion && support === 'tooOld' && <StatusPill tone="warning" label={tCatalog('fromVersion', { version: def.minVersion })} />}
      {def.maxVersion && support === 'removed' && (
        <StatusPill tone="warning" label={tCatalog('untilVersion', { version: def.maxVersion })} />
      )}
    </>
  );

  const menu: MenuEntry[] = [
    { icon: <RotateCcw />, label: t('reset'), onSelect: () => onChange(def.defaultValue()) },
    {
      icon: <Copy />,
      label: t('copyYaml'),
      onSelect: () => void navigator.clipboard?.writeText(yamlOf(def, toConfigValue(value) ?? null)),
    },
    'separator',
    { icon: <Trash2 />, label: t('remove'), destructive: true, onSelect: onRemove },
  ];

  const notes = [
    def.hint && text(def.hint),
    support === 'tooOld' && t('tooOld', { min: def.minVersion ?? '', version: version ?? '' }),
    support === 'removed' && t('removed', { max: def.maxVersion ?? '' }),
    def.badge === 'premium' && t('premium'),
    ...issues.map((i) => i.message),
  ].filter((note): note is string => !!note);

  let control = null;
  if (def.field.type === 'boolean') {
    control = <BooleanSwitch required value={typeof value === 'boolean' ? value : undefined} onChange={onChange} label={label} />;
  } else if (def.field.type === 'number') {
    const field = def.field;
    control = (
      <NumberInput
        label={label}
        className="w-28 font-mono"
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        onChange={(next) => onChange(next ?? null)}
        integer={field.integer}
        min={field.min}
        max={field.max}
      />
    );
  }

  return (
    <FeatureRow
      featureId={def.id}
      label={label}
      summary={summary}
      yamlKey={propertyYamlPath(def) ?? undefined}
      docs={def.docs && target ? { url: def.docs, target } : undefined}
      badges={badges}
      issue={issue}
      control={control ?? undefined}
      menu={menu}
      open={open ?? storedOpen}
      onOpenChange={(next) => {
        if (expansionKey) setFeatureExpanded(expansionKey, next);
        onOpenChange?.(next);
      }}
    >
      {!control && (
        <>
          <FieldRenderer field={def.field} value={value} root hideLabel={def.field.type !== 'object'} onChange={onChange} />
          {notes.length > 0 && <FeatureNotes>{notes.join(' ')}</FeatureNotes>}
        </>
      )}
    </FeatureRow>
  );
}
