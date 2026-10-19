/**
 * One key of an item model node, property, special model or tint source as a field row: a readable label, the control
 * for its kind (text, number, on/off, enum, color, YAML), the key in the key rail, its help in the ⓘ popover and a
 * version badge.
 */
import { type ReactNode, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { type ConfigValue, type ItemModelParam, itemModelMessages, toConfigValue } from '@resourcepackbuilder/core/project';
import { parseYaml, toYaml } from '@resourcepackbuilder/core/yaml';
import { FieldGroup, FieldRow, StatusPill } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { humanizeKey } from '../../../../components/catalog';
import { BooleanSwitch } from '../../../../components/editor/inputs/BooleanSwitch';
import { NumberInput } from '../../../../components/editor/inputs/NumberInput';
import { TextInput } from '../../../../components/editor/inputs/TextInput';
import { useSchemaText } from '../../../../components/useSchemaText';

type Change = (value: ConfigValue | undefined) => void;

/** An int color (0xRRGGBB) as `#rrggbb`. */
const toHex = (value: ConfigValue | undefined) =>
  `#${((typeof value === 'number' ? value : 0xffffff) & 0xffffff).toString(16).padStart(6, '0')}`;

/** A YAML value typed into a text area; committed when it parses. */
export function YamlValue({ id, value, onChange }: { id: string; value: ConfigValue | undefined; onChange: Change }) {
  const format = (v: ConfigValue | undefined) => (v === undefined ? '' : toYaml(v).trimEnd());
  const [draft, setDraft] = useState<{ source: ConfigValue | undefined; text: string } | null>(null);
  const text = draft && draft.source === value ? draft.text : format(value);
  const parsed = parseYaml(text);
  return (
    <Textarea
      id={id}
      className="min-h-16 font-mono text-meta"
      aria-invalid={parsed.error !== null || undefined}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        const result = parseYaml(next);
        const committed = result.error === null ? (next.trim() === '' ? undefined : toConfigValue(result.value)) : value;
        setDraft({ source: committed, text: next });
        if (result.error === null) onChange(committed);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

/** The input of a key by its kind. */
function ParamInput({
  id,
  param,
  value,
  onChange,
}: {
  id: string;
  param: ItemModelParam;
  value: ConfigValue | undefined;
  onChange: Change;
}) {
  const t = useTranslations('schema');
  switch (param.kind) {
    case 'integer':
    case 'number':
      return (
        <NumberInput
          id={id}
          className="max-w-40"
          value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
          integer={param.kind === 'integer'}
          onChange={onChange}
          label={param.key}
        />
      );
    case 'boolean':
      return <BooleanSwitch id={id} value={typeof value === 'boolean' ? value : undefined} onChange={onChange} />;
    case 'enum':
      return (
        <NativeSelect
          id={id}
          size="sm"
          className="w-full"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <NativeSelectOption value="">{t('itemModel.ui.unset')}</NativeSelectOption>
          {param.options?.map((option) => (
            <NativeSelectOption key={option} value={option}>
              {option}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="color"
            className="h-8 w-10 flex-none cursor-pointer p-0.5"
            value={toHex(value)}
            onChange={(e) => onChange(parseInt(e.target.value.slice(1), 16))}
          />
          <NumberInput
            className="max-w-40"
            value={typeof value === 'number' ? value : undefined}
            integer
            min={0}
            onChange={onChange}
            label={param.key}
          />
        </div>
      );
    case 'json':
      return <YamlValue id={id} value={value} onChange={onChange} />;
    default:
      return (
        <TextInput
          id={id}
          mono
          value={typeof value === 'string' ? value : value === undefined ? undefined : String(value)}
          onChange={onChange}
        />
      );
  }
}

/** A key as a field row: readable label, control, key rail, help and version badge; `children` go below the control. */
export function ParamField({
  param,
  value,
  onChange,
  children,
}: {
  param: ItemModelParam;
  value: ConfigValue | undefined;
  onChange: Change;
  children?: ReactNode;
}) {
  const id = useId();
  const t = useTranslations('schema');
  const text = useSchemaText();
  return (
    <FieldRow
      label={humanizeKey(param.key)}
      htmlFor={param.kind === 'boolean' || param.kind === 'json' ? undefined : id}
      yamlKey={param.key}
      help={text(itemModelMessages.param(param.key))}
      state={value === undefined ? 'default' : 'set'}
      badges={param.minVersion && <StatusPill tone="info" label={t('itemModel.ui.fromVersion', { version: param.minVersion })} />}
      layout={param.kind === 'json' ? 'stacked' : 'side'}
    >
      <ParamInput id={id} param={param} value={value} onChange={onChange} />
      {children}
    </FieldRow>
  );
}

/** The keys of an object (node, special model, tint) as field rows; `update` sets one of them. */
export function ParamList({
  params,
  owner,
  update,
}: {
  params: ItemModelParam[];
  owner: Record<string, ConfigValue>;
  update: (key: string, value: ConfigValue | undefined) => void;
}) {
  if (params.length === 0) return null;
  return (
    <FieldGroup>
      {params.map((param) => (
        <ParamField key={param.key} param={param} value={owner[param.key]} onChange={(value) => update(param.key, value)} />
      ))}
    </FieldGroup>
  );
}
