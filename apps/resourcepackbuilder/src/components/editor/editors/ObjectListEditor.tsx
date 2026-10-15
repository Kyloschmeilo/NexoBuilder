import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ObjectField, ObjectListField } from '@resourcepackbuilder/core/nexo/fields';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { IconButton } from '@resourcepackbuilder/ui';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import { AddButton, ListControls } from '../inputs/ListControls';
import type { EditorProps } from '../types';
import { useRowKeys } from '../useRowKeys';
import { insertAt, listOrUndefined, moveInArray, removeAt, replaceAt } from '../values';
import { EntryCard } from './EntryCard';
import { ObjectFields } from './ObjectEditor';

/** Text of an entry's title field, if it has one. */
function entryTitle(field: ObjectListField, entry: Record<string, unknown>): string {
  const title = field.titleKey ? entry[field.titleKey] : undefined;
  return typeof title === 'string' ? title : '';
}

export function ObjectListEditor({ field, value, onChange, hideLabel }: EditorProps<ObjectListField>) {
  const t = useTranslations('editor');
  const tCommon = useTranslations('common');
  const text = useSchemaText();
  const itemLabel = text(field.itemLabel) ?? '';
  const list: unknown[] = Array.isArray(value) ? value : [];
  const rows = useRowKeys(list.length);
  const commit = (next: unknown[]) => onChange(listOrUndefined(next));
  const entryField: ObjectField = { type: 'object', key: '', label: '', fields: field.fields };

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <div className="flex flex-col gap-2.5">
        {list.map((entry, i) => {
          const obj = isPlainObject(entry) ? entry : {};
          const title = entryTitle(field, obj);
          return (
            <EntryCard
              key={rows.keys[i]}
              header={
                <>
                  <span className="min-w-0 flex-1 truncate">
                    {itemLabel} {i + 1}
                    {title && <span className="font-normal text-muted-foreground"> · {title}</span>}
                  </span>
                  <IconButton
                    label={tCommon('duplicate')}
                    onClick={() => {
                      rows.insert(i + 1);
                      commit(insertAt(list, i + 1, structuredClone(obj)));
                    }}
                  >
                    <Copy />
                  </IconButton>
                  <ListControls
                    index={i}
                    count={list.length}
                    onMove={(from, to) => {
                      rows.move(from, to);
                      commit(moveInArray(list, from, to));
                    }}
                    onRemove={() => {
                      rows.remove(i);
                      commit(removeAt(list, i));
                    }}
                  />
                </>
              }
            >
              <ObjectFields field={entryField} value={obj} onChange={(next) => commit(replaceAt(list, i, next))} />
            </EntryCard>
          );
        })}
        <AddButton
          label={t('field.addItem', { item: itemLabel })}
          onClick={() => {
            rows.insert(list.length);
            commit([...list, field.newItem?.() ?? {}]);
          }}
        />
      </div>
    </FieldShell>
  );
}
