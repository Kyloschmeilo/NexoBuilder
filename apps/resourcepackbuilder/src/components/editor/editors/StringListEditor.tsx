import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { StringListField } from '@resourcepackbuilder/core/nexo/fields';
import { validateTextFormat } from '@resourcepackbuilder/core/nexo/fieldFormat';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { MiniMessageBox } from '../../miniMessage/MiniMessageBox';
import { MiniMessageLoreLine } from '../../miniMessage/MiniMessageLine';
import { useSchemaText } from '../../useSchemaText';
import { FieldErrorText, FieldShell } from '../FieldShell';
import { AddButton, ListControls } from '../inputs/ListControls';
import { Datalist } from '../inputs/TextInput';
import type { EditorProps } from '../types';
import { useRowKeys } from '../useRowKeys';
import { insertAt, listOrUndefined, moveInArray, removeAt, replaceAt, toStringList } from '../values';

export function StringListEditor({ field, value, onChange, hideLabel }: EditorProps<StringListField>) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const listId = useId();
  const list = toStringList(value);
  const rows = useRowKeys(list.length);
  /** The row created by Enter, which takes the focus when it mounts. */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const commit = (next: string[]) => onChange(listOrUndefined(next));
  const placeholder = text(field.placeholder);

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <div className="flex flex-col gap-2">
        {list.map((entry, i) => {
          const error = text(entry ? (validateTextFormat(field.format, entry) ?? undefined) : undefined);
          const key = rows.keys[i];
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <Input
                  className="min-w-0 flex-1"
                  aria-invalid={!!error || undefined}
                  value={entry}
                  list={field.suggestions?.length ? listId : undefined}
                  placeholder={placeholder}
                  spellCheck={false}
                  autoFocus={key === focusKey}
                  onChange={(e) => commit(replaceAt(list, i, e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    setFocusKey(rows.insert(i + 1));
                    commit(insertAt(list, i + 1, ''));
                  }}
                />
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
              </div>
              {field.format === 'minimessage' && entry && (
                <MiniMessageBox className="min-w-0">
                  <MiniMessageLoreLine text={entry} />
                </MiniMessageBox>
              )}
              {error && <FieldErrorText>{error}</FieldErrorText>}
            </div>
          );
        })}
        <Datalist id={listId} choices={field.suggestions} />
        <AddButton
          label={t('field.addEntry')}
          onClick={() => {
            rows.insert(list.length);
            commit([...list, '']);
          }}
        />
      </div>
    </FieldShell>
  );
}
