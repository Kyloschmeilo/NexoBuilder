import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ObjectField } from '@resourcepackbuilder/core/nexo/fields';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { CollapsibleSection, IconButton } from '@resourcepackbuilder/ui';
import { FieldDescription } from '@resourcepackbuilder/ui/components/field';
import { useSchemaText } from '../../useSchemaText';
import { FieldGrid, FieldRenderer } from '../FieldRenderer';
import { MinVersionBadge, useFieldTitle } from '../FieldShell';
import type { EditorProps } from '../types';
import { countSetValues, isWideField, objectOrUndefined, unknownEntries, withKey, withUnknownEntries } from '../values';

/** The fields of an object: simple ones in a grid, wide ones (lists, nested objects…) below at full width. */
export function ObjectFields({
  field,
  value,
  onChange,
}: {
  field: ObjectField;
  value: unknown;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const object = isPlainObject(value) ? value : {};
  const known = new Set(field.fields.map((f) => f.key));
  const simple = field.fields.filter((f) => !isWideField(f));
  const wide = field.fields.filter(isWideField);
  return (
    <div className="flex flex-col gap-3">
      {simple.length > 0 && (
        <FieldGrid>
          {simple.map((f) => (
            <FieldRenderer key={f.key} field={f} value={object[f.key]} siblings={object} onChange={(v) => onChange(withKey(object, f.key, v))} />
          ))}
        </FieldGrid>
      )}
      {wide.map((f) =>
        // "*" edits all keys no other field claims
        f.key === '*' ? (
          <FieldRenderer
            key="*"
            field={f}
            value={unknownEntries(object, known)}
            siblings={object}
            onChange={(rest) => onChange(withUnknownEntries(object, known, rest))}
          />
        ) : (
          <FieldRenderer key={f.key} field={f} value={object[f.key]} siblings={object} onChange={(v) => onChange(withKey(object, f.key, v))} />
        ),
      )}
    </div>
  );
}

/** A nested object as a collapsible section; it opens by itself when it gets a value (e.g. by paste or undo). */
function ObjectSection({ field, value, onChange }: EditorProps<ObjectField>) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const { title, description } = useFieldTitle(field);
  const count = countSetValues(value);
  const [isOpen, setIsOpen] = useState(count > 0);
  const [hadValues, setHadValues] = useState(count > 0);
  if (hadValues !== count > 0) {
    setHadValues(count > 0);
    if (count > 0) setIsOpen(true);
  }
  const help = text(field.help);
  return (
    <CollapsibleSection
      className="col-span-full"
      open={isOpen}
      onOpenChange={setIsOpen}
      title={title}
      titleHint={description}
      meta={
        <>
          <MinVersionBadge field={field} />
          {count > 0 && <span className="font-mono">{t('field.countSet', { count })}</span>}
        </>
      }
      actions={
        count > 0 && (
          <IconButton label={t('field.clearSection')} size="icon-xs" onClick={() => onChange(undefined)}>
            <X />
          </IconButton>
        )
      }
    >
      {help && <FieldDescription className="mb-2.5 text-xs leading-4">{help}</FieldDescription>}
      <ObjectFields field={field} value={value} onChange={(next) => onChange(objectOrUndefined(next))} />
    </CollapsibleSection>
  );
}

/** Top-level objects show their fields directly; nested ones are collapsible sections. */
export function ObjectEditor(props: EditorProps<ObjectField>) {
  return props.root ? <ObjectFields field={props.field} value={props.value} onChange={props.onChange} /> : <ObjectSection {...props} />;
}
