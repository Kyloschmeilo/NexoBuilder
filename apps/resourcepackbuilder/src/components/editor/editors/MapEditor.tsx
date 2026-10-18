/**
 * A map field as the key/value table of the ui `MapEditor`: mono keys that rename in place, the value field's editor
 * per entry (stacked below its key when the value needs the width), and an add row with the schema's key suggestions.
 * Keys that other fields of the same object own are hidden and refused.
 */
import { useTranslations } from 'next-intl';
import type { MapField } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { MapEditor as MapTable } from '@resourcepackbuilder/ui';
import { useSchemaText } from '../../useSchemaText';
import { FieldRenderer } from '../FieldRenderer';
import { FieldShell } from '../FieldShell';
import type { EditorProps } from '../types';
import { isWideField, objectOrUndefined } from '../values';
import { ObjectFields } from './ObjectEditor';

export function MapEditor({ field, value, onChange, hideLabel }: EditorProps<MapField>) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const keyLabel = text(field.keyLabel) || undefined;
  const map = isPlainObject(value) ? value : {};
  const valueField = field.value;

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <MapTable<unknown>
        entries={map}
        onChange={(next) => onChange(objectOrUndefined(next))}
        renderValue={(entry, change) =>
          valueField.type === 'object' ? (
            <ObjectFields field={valueField} value={entry} onChange={change} />
          ) : (
            <FieldRenderer field={valueField} value={entry} hideLabel onChange={change} />
          )
        }
        newValue={() => field.newValue?.() ?? (valueField.type === 'object' ? {} : '')}
        keyLabel={keyLabel}
        keyPlaceholder={text(field.keyPlaceholder) ?? keyLabel}
        keySuggestions={field.keyOptions?.map((option) => option.value)}
        reservedKeys={field.reservedKeys}
        addLabel={keyLabel ? t('field.addItem', { item: keyLabel }) : undefined}
        stacked={isWideField(valueField)}
      />
    </FieldShell>
  );
}
