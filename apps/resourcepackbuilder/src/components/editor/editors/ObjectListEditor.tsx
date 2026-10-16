import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ObjectField, ObjectListField } from '@resourcepackbuilder/core/nexo';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { IconButton, useRowKeys } from '@resourcepackbuilder/ui';
import { Card, CardContent, CardHeader } from '@resourcepackbuilder/ui/components/card';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import { AddButton, ListControls } from '../inputs/ListControls';
import type { EditorProps } from '../types';
import { insertAt, listOrUndefined, moveInArray, removeAt, replaceAt } from '../values';
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
          const entryObject = isPlainObject(entry) ? entry : {};
          const title = entryTitle(field, entryObject);
          return (
            <Card key={rows.keys[i]} variant="muted" size="sm" className="gap-0 py-0">
              <CardHeader className="flex items-center gap-1.5 border-b py-1.5 pr-2 font-semibold [.border-b]:pb-1.5">
                <>
                  <span className="min-w-0 flex-1 truncate">
                    {itemLabel} {i + 1}
                    {title && <span className="font-normal text-muted-foreground"> · {title}</span>}
                  </span>
                  <IconButton
                    label={tCommon('duplicate')}
                    onClick={() => {
                      rows.insert(i + 1);
                      commit(insertAt(list, i + 1, structuredClone(entryObject)));
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
              </CardHeader>
              <CardContent className="py-3">
                <ObjectFields field={entryField} value={entryObject} onChange={(next) => commit(replaceAt(list, i, next))} />
              </CardContent>
            </Card>
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
