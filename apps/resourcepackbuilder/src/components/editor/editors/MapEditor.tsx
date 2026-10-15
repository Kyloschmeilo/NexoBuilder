import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MapField } from '@resourcepackbuilder/core/nexo/fields';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { IconButton } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { useSchemaText } from '../../useSchemaText';
import { FieldRenderer } from '../FieldRenderer';
import { FieldErrorText, FieldShell } from '../FieldShell';
import { Datalist } from '../inputs/TextInput';
import type { EditorProps } from '../types';
import { useDraft } from '../useDraft';
import { isWideField, objectOrUndefined, renameKey, withKey } from '../values';
import { EntryCard } from './EntryCard';
import { ObjectFields } from './ObjectEditor';

/** The key of a map entry; a rename is applied when the input loses focus. */
function KeyInput({ value, onRename, listId }: { value: string; onRename: (key: string) => void; listId: string }) {
  const { draft, setDraft, reset } = useDraft(
    value,
    (text) => ({ value: text.trim() }),
    (key) => key,
  );
  return (
    <Input
      className="w-[220px] flex-none font-mono"
      value={draft}
      list={listId}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const key = draft.trim();
        if (key && key !== value) onRename(key);
        // A successful rename remounts the row under its new key; a rejected one shows the old key again
        reset();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      spellCheck={false}
    />
  );
}

export function MapEditor({ field, value, onChange, hideLabel }: EditorProps<MapField>) {
  const t = useTranslations('ui');
  const common = useTranslations('common');
  const text = useSchemaText();
  const keyLabel = text(field.keyLabel) ?? '';
  const obj = isPlainObject(value) ? value : {};
  const reserved = field.reservedKeys ?? [];
  const entries = Object.entries(obj).filter(([key]) => !reserved.includes(key));
  const [newKey, setNewKey] = useState('');
  const listId = useId();
  const trimmedKey = newKey.trim();
  const keyTaken = trimmedKey !== '' && (trimmedKey in obj || reserved.includes(trimmedKey));
  const valueField = field.value;

  const commit = (next: Record<string, unknown>) => onChange(objectOrUndefined(next));
  const rename = (oldKey: string, nextKey: string) => {
    if (nextKey !== oldKey && !(nextKey in obj)) commit(renameKey(obj, oldKey, nextKey));
  };
  const add = () => {
    if (!trimmedKey || keyTaken) return;
    commit({ ...obj, [trimmedKey]: field.newValue?.() ?? (valueField.type === 'object' ? {} : '') });
    setNewKey('');
  };
  const removeButton = (key: string) => (
    <IconButton label={common('remove')} tone="destructive" onClick={() => commit(withKey(obj, key, undefined))}>
      <Trash2 />
    </IconButton>
  );

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <div className="flex flex-col gap-2">
        {entries.map(([key, entry]) =>
          isWideField(valueField) ? (
            <EntryCard
              key={key}
              header={
                <>
                  <KeyInput value={key} onRename={(k) => rename(key, k)} listId={listId} />
                  <span className="flex-1" />
                  {removeButton(key)}
                </>
              }
            >
              {valueField.type === 'object' ? (
                <ObjectFields field={valueField} value={entry} onChange={(v) => commit({ ...obj, [key]: v })} />
              ) : (
                <FieldRenderer field={valueField} value={entry} hideLabel onChange={(v) => commit({ ...obj, [key]: v })} />
              )}
            </EntryCard>
          ) : (
            <div key={key} className="flex items-start gap-2">
              <KeyInput value={key} onRename={(k) => rename(key, k)} listId={listId} />
              <div className="min-w-0 flex-1">
                <FieldRenderer field={valueField} value={entry} hideLabel onChange={(v) => commit({ ...obj, [key]: v })} />
              </div>
              {removeButton(key)}
            </div>
          ),
        )}
        <div className="flex flex-wrap items-start gap-2">
          <Input
            className="min-w-0 flex-1 basis-48"
            aria-invalid={keyTaken || undefined}
            placeholder={text(field.keyPlaceholder) ?? keyLabel}
            value={newKey}
            list={field.keyOptions?.length ? listId : undefined}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
            spellCheck={false}
          />
          <Button type="button" variant="outline" onClick={add} disabled={!trimmedKey || keyTaken}>
            <Plus /> {t('field.addItem', { item: keyLabel })}
          </Button>
        </div>
        {keyTaken && <FieldErrorText>{t('field.keyTaken', { key: trimmedKey })}</FieldErrorText>}
        <Datalist id={listId} choices={field.keyOptions?.filter((option) => !(option.value in obj))} />
      </div>
    </FieldShell>
  );
}
