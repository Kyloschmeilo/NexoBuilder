/**
 * A list of strings as `ListEditor` rows with the text editable in the row itself. Enter adds a row below and moves
 * there; vectors get the x/y/z inputs; MiniMessage lines (lore) get one rendered preview of all lines below the list.
 */
import { useId, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useTranslations } from 'next-intl';
import { type StringListField, validateTextFormat } from '@resourcepackbuilder/core/form';
import { ListEditor } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { useSchemaText } from '../../useSchemaText';
import { useFieldContext } from '../fieldContext';
import { FieldShell, useFieldLabel } from '../FieldShell';
import { MiniMessageChip } from '../inputs/MiniMessageChip';
import { Datalist } from '../inputs/TextInput';
import { Vector3Input } from '../inputs/Vector3Input';
import type { EditorProps } from '../types';
import { insertAt, listOrUndefined, replaceAt, toStringList } from '../values';

export function StringListEditor({ field, value, onChange, hideLabel }: EditorProps<StringListField>) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const label = useFieldLabel(field);
  const listId = useId();
  const host = useRef<HTMLDivElement>(null);
  const { dynamicSuggestions } = useFieldContext();
  const projectSuggestions = field.dynamicSuggestions ? dynamicSuggestions?.[field.dynamicSuggestions] : undefined;
  const suggestions = [...(field.suggestions ?? []), ...(projectSuggestions ?? [])];
  const list = toStringList(value);
  const commit = (next: string[]) => onChange(listOrUndefined(next));
  const placeholder = text(field.placeholder);
  const errors = list.map((entry) => text(entry ? (validateTextFormat(field.format, entry) ?? undefined) : undefined));

  /** Enter in a row: a new empty row below it takes the focus. */
  const addBelow = (index: number) => {
    flushSync(() => commit(insertAt(list, index + 1, '')));
    host.current?.querySelectorAll<HTMLElement>('[data-slot=list-row]')[index + 1]?.querySelector<HTMLElement>('input')?.focus();
  };

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <div ref={host} className="flex min-w-0 flex-col gap-1.5">
        <ListEditor<string>
          aria-label={label}
          items={list}
          onChange={commit}
          renderSummary={(entry, i) =>
            field.format === 'vector' ? (
              <Vector3Input value={entry} onChange={(next) => commit(replaceAt(list, i, next ?? ''))} placeholder={placeholder} />
            ) : (
              <Input
                aria-label={t('field.entry', { index: i + 1 })}
                aria-invalid={!!errors[i] || undefined}
                className="h-7 font-normal"
                value={entry}
                list={suggestions.length ? listId : undefined}
                placeholder={placeholder}
                spellCheck={false}
                onChange={(e) => commit(replaceAt(list, i, e.target.value))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  addBelow(i);
                }}
              />
            )
          }
          onAdd={() => addBelow(list.length - 1)}
          addLabel={t('field.addEntry')}
          emptyText={t('field.listEmpty')}
        />
        {errors.map(
          (error, i) =>
            error && (
              // One message per invalid line, in line order
              <p key={i} className="m-0 text-meta text-danger">
                {t('field.entryError', { index: i + 1, error })}
              </p>
            ),
        )}
        {field.format === 'minimessage' && list.some(Boolean) && <MiniMessageChip lines={list} />}
        <Datalist id={listId} choices={suggestions} />
      </div>
    </FieldShell>
  );
}
