/**
 * One key of an item model node, property, special model or tint source, edited by its kind (text, number, yes/no,
 * enum, color, YAML), with the key name as label, its help text and a version badge.
 */
import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { type ConfigValue, type ItemModelParam, itemModelMessages, toConfigValue } from '@resourcepackbuilder/core/project';
import { parseYaml, toYaml } from '@resourcepackbuilder/core/yaml';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { NumberInput } from '../../../../components/editor/inputs/NumberInput';
import { TextInput } from '../../../../components/editor/inputs/TextInput';
import { TriState } from '../../../../components/editor/inputs/TriState';
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
      className="min-h-16 font-mono text-xs"
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
          value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
          integer={param.kind === 'integer'}
          onChange={onChange}
          label={param.key}
        />
      );
    case 'boolean':
      return <TriState value={typeof value === 'boolean' ? value : undefined} onChange={onChange} />;
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
          <NumberInput value={typeof value === 'number' ? value : undefined} integer min={0} onChange={onChange} label={param.key} />
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

/** A key with its name, help text and version badge. */
export function ParamField({ param, value, onChange }: { param: ItemModelParam; value: ConfigValue | undefined; onChange: Change }) {
  const id = useId();
  const t = useTranslations('schema');
  const text = useSchemaText();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="flex items-center gap-2 font-mono text-xs font-medium">
        {param.key}
        {param.minVersion && <Badge variant="outline">{t('itemModel.ui.fromVersion', { version: param.minVersion })}</Badge>}
      </label>
      <ParamInput id={id} param={param} value={value} onChange={onChange} />
      <p className="text-xs text-muted-foreground">{text(itemModelMessages.param(param.key))}</p>
    </div>
  );
}

/** The keys of an object (node, special model, tint) in a grid; `update` sets one of them. */
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
    <div className="grid gap-3 sm:grid-cols-2">
      {params.map((param) => (
        <ParamField key={param.key} param={param} value={owner[param.key]} onChange={(value) => update(param.key, value)} />
      ))}
    </div>
  );
}
