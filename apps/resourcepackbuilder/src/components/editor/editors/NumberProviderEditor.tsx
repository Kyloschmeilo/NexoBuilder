/**
 * A number provider: a value (a number, a range like `1~3` or an expression, stored as typed; the export writes numeric
 * text as a number) or a typed object such as `{ type: uniform, min, max }` with the fields of its type.
 */
import { useTranslations } from 'next-intl';
import type { NumberProviderField } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { SegmentedControl } from '@resourcepackbuilder/ui';
import { FieldShell } from '../FieldShell';
import { TextInput } from '../inputs/TextInput';
import type { EditorProps } from '../types';
import { TypedEntryBody, TypeInput } from './TypedListEditor';

type Mode = 'value' | 'object';

export function NumberProviderEditor({ field, value, onChange, hideLabel }: EditorProps<NumberProviderField>) {
  const t = useTranslations('editor');
  const mode: Mode = isPlainObject(value) ? 'object' : 'value';
  const scalar = typeof value === 'number' || typeof value === 'boolean' ? String(value) : typeof value === 'string' ? value : undefined;
  return (
    <FieldShell field={field} hideLabel={hideLabel}>
      <div className="flex flex-col gap-1.5">
        <SegmentedControl<Mode>
          size="sm"
          className="self-start"
          value={mode}
          onChange={(next) => onChange(next === 'object' ? {} : undefined)}
          options={[
            { value: 'value', label: t('typed.value'), hint: t('typed.valueHint') },
            { value: 'object', label: t('typed.object'), hint: t('typed.objectHint') },
          ]}
        />
        {isPlainObject(value) ? (
          <div className="flex flex-col gap-2 rounded-md border p-2">
            <TypeInput source={field} entry={value} onChange={onChange} />
            <TypedEntryBody source={field} entry={value} onChange={onChange} />
          </div>
        ) : (
          <TextInput mono value={scalar} onChange={onChange} placeholder={t('typed.valuePlaceholder')} />
        )}
      </div>
    </FieldShell>
  );
}
