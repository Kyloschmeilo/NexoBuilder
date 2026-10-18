/**
 * A list of objects switched by their `type` (e.g. CraftEngine conditions or functions): each entry has a searchable
 * type input and that type's fields; an entry of a type the catalog does not know is edited as YAML.
 */
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { findTypedType, type ObjectField, type TypedListField, type TypedType, type YamlField } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { IconButton, Tip, useRowKeys } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardContent, CardHeader } from '@resourcepackbuilder/ui/components/card';
import { FieldDescription } from '@resourcepackbuilder/ui/components/field';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import type { LiteralChoice } from '../inputs/choices';
import { AddButton, ListControls } from '../inputs/ListControls';
import { TextInput } from '../inputs/TextInput';
import type { EditorProps } from '../types';
import { insertAt, listOrUndefined, moveInArray, removeAt, replaceAt, typeParts, withEntryType } from '../values';
import { ObjectFields } from './ObjectEditor';
import { YamlEditor } from './YamlEditor';

/** What the typed entry editors need from a typed list or number provider field. */
interface TypedSource {
  types: () => readonly TypedType[];
  invertible?: boolean;
}

const ENTRY_YAML: YamlField = { type: 'yaml', key: '', label: '' };

/**
 * The searchable type input of an entry, with a Premium badge, a link to the type's docs and (for conditions) the "!"
 * toggle. The type is set
 * when it is picked or typed out (blur, Enter), so the entry's fields do not switch on every keystroke.
 */
export function TypeInput({
  source,
  entry,
  onChange,
}: {
  source: TypedSource;
  entry: Record<string, unknown>;
  onChange: (entry: Record<string, unknown>) => void;
}) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const types = source.types();
  const suggestions = useMemo<LiteralChoice[]>(
    () =>
      types.map((type) => ({ value: type.type, text: [text(type.help), type.premium && t('typed.premium')].filter(Boolean).join(' · ') })),
    [types, text, t],
  );
  const { name, inverted } = typeParts(entry.type, source.invertible);
  const known = findTypedType(source, entry);
  const setType = (nextName: string, nextInverted: boolean) => {
    const nextType = nextName && nextInverted ? `!${nextName}` : nextName;
    onChange(
      withEntryType(
        entry,
        nextType,
        types.find((type) => type.type === nextName),
      ),
    );
  };
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <TextInput
        className="max-w-72 flex-1"
        mono
        value={name}
        onChange={(next) => setType(next?.trim() ?? '', inverted)}
        suggestions={suggestions}
        placeholder={t('typed.typePlaceholder')}
        commitOnBlur
      />
      {source.invertible && (
        <Tip label={t('typed.invertHint')}>
          <Button
            type="button"
            size="sm"
            variant={inverted ? 'secondary' : 'ghost'}
            aria-pressed={inverted}
            onClick={() => setType(name, !inverted)}
          >
            ! {t('typed.invert')}
          </Button>
        </Tip>
      )}
      {known?.premium && (
        <Tip label={t('typed.premiumHint')}>
          <Badge variant="info">{t('typed.premium')}</Badge>
        </Tip>
      )}
      {known?.docs && (
        <IconButton
          label={t('typed.docs')}
          size="icon-sm"
          nativeButton={false}
          render={<a href={known.docs} target="_blank" rel="noreferrer" />}
        >
          <ExternalLink />
        </IconButton>
      )}
    </div>
  );
}

/** The body of a typed entry: the fields of its type, YAML for an unknown type, a hint while it has none. */
export function TypedEntryBody({ source, entry, onChange }: { source: TypedSource; entry: unknown; onChange: (entry: unknown) => void }) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const type = findTypedType(source, entry);
  if (type) {
    const help = text(type.help);
    const fields: ObjectField = { type: 'object', key: '', label: '', fields: type.fields };
    return (
      <div className="flex flex-col gap-2.5">
        {help && <FieldDescription className="text-xs leading-4">{help}</FieldDescription>}
        {type.fields.length > 0 && <ObjectFields field={fields} value={entry} onChange={onChange} />}
      </div>
    );
  }
  const { name } = typeParts(isPlainObject(entry) ? entry.type : undefined, source.invertible);
  if (isPlainObject(entry) && !name && Object.keys(entry).length === 0) {
    return <FieldDescription className="text-xs leading-4">{t('typed.chooseType')}</FieldDescription>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <FieldDescription className="text-xs leading-4">{t('typed.unknownType', { type: name })}</FieldDescription>
      <YamlEditor field={ENTRY_YAML} value={entry} onChange={(next) => onChange(next ?? {})} hideLabel />
    </div>
  );
}

export function TypedListEditor({ field, value, onChange, hideLabel }: EditorProps<TypedListField>) {
  const t = useTranslations('editor');
  // A single entry may stand without a list; editing writes the list
  const list: unknown[] = Array.isArray(value) ? value : isPlainObject(value) ? [value] : [];
  const rows = useRowKeys(list.length);
  const commit = (next: unknown[]) => onChange(listOrUndefined(next));

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <div className="flex flex-col gap-2.5">
        {list.map((entry, i) => {
          const entryObject = isPlainObject(entry) ? entry : {};
          return (
            <Card key={rows.keys[i]} variant="muted" size="sm" className="gap-0 py-0">
              <CardHeader className="flex items-center gap-1.5 border-b py-1.5 pr-2 [.border-b]:pb-1.5">
                <TypeInput source={field} entry={entryObject} onChange={(next) => commit(replaceAt(list, i, next))} />
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
              </CardHeader>
              <CardContent className="py-3">
                <TypedEntryBody source={field} entry={entry} onChange={(next) => commit(replaceAt(list, i, next))} />
              </CardContent>
            </Card>
          );
        })}
        <AddButton
          label={t('field.addItem', { item: t('typed.entry') })}
          onClick={() => {
            rows.insert(list.length);
            commit(insertAt(list, list.length, {}));
          }}
        />
      </div>
    </FieldShell>
  );
}
