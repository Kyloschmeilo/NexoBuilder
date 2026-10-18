/**
 * A list of objects as `ListEditor` rows: each row is summarised by the entry's name and its title field, and expands
 * to the entry's fields. Rows can be dragged, moved, duplicated and removed.
 */
import { useTranslations } from 'next-intl';
import type { ObjectField, ObjectListField } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { ListEditor } from '@resourcepackbuilder/ui';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell, useFieldLabel } from '../FieldShell';
import type { EditorProps } from '../types';
import { countSetValues, listOrUndefined } from '../values';
import { ObjectFields } from './ObjectEditor';

/** Text of an entry's title field, if it has one. */
function entryTitle(field: ObjectListField, entry: Record<string, unknown>): string {
  const title = field.titleKey ? entry[field.titleKey] : undefined;
  return typeof title === 'string' || typeof title === 'number' ? String(title) : '';
}

export function ObjectListEditor({ field, value, onChange, hideLabel }: EditorProps<ObjectListField>) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const label = useFieldLabel(field);
  const itemLabel = text(field.itemLabel) ?? '';
  const list: unknown[] = Array.isArray(value) ? value : [];
  const entryField: ObjectField = { type: 'object', key: '', label: '', fields: field.fields };

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <ListEditor<unknown>
        aria-label={label}
        items={list}
        onChange={(next) => onChange(listOrUndefined(next))}
        renderSummary={(entry, i) => {
          const object = isPlainObject(entry) ? entry : {};
          const title = entryTitle(field, object);
          const count = countSetValues(object);
          return (
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="flex-none">
                {itemLabel} {i + 1}
              </span>
              {title && <span className="min-w-0 truncate font-mono text-meta text-text-muted">{title}</span>}
              {!title && count > 0 && <span className="text-meta text-text-faint">{t('field.countSet', { count })}</span>}
            </span>
          );
        }}
        renderEditor={(entry, change) => (
          <ObjectFields field={entryField} value={isPlainObject(entry) ? entry : {}} onChange={(next) => change(next)} />
        )}
        onAdd={() => onChange([...list, field.newItem?.() ?? {}])}
        addLabel={t('field.addItem', { item: itemLabel })}
        emptyText={t('field.listEmpty')}
      />
    </FieldShell>
  );
}
