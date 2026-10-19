import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Field, ObjectField } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { CollapsibleSection, DocsLink, FieldGroup, Help, IconButton, MoreOptions } from '@resourcepackbuilder/ui';
import { useProjectStore } from '../../../store/project';
import { useSchemaText } from '../../useSchemaText';
import { FieldRenderer } from '../FieldRenderer';
import { fieldYamlKey, MinVersionBadge, useFieldLabel } from '../FieldShell';
import type { EditorProps } from '../types';
import { arrangeObjectFields, countSetValues, objectOrUndefined, unknownEntries, withKey, withUnknownEntries } from '../values';

/** The fields of an object as field rows; fields marked `advanced` sit in "More options" below the common ones. */
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
  const { common, advanced } = arrangeObjectFields(field.fields);
  const render = (f: Field) =>
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
    );
  const hasAdvancedValue = advanced.some((f) =>
    f.key === '*' ? countSetValues(unknownEntries(object, known)) > 0 : countSetValues({ [f.key]: object[f.key] }) > 0,
  );
  return (
    <FieldGroup>
      {common.map(render)}
      {advanced.length > 0 && (
        <MoreOptions count={advanced.length} hasValue={hasAdvancedValue}>
          <FieldGroup>{advanced.map(render)}</FieldGroup>
        </MoreOptions>
      )}
    </FieldGroup>
  );
}

/**
 * A nested object as a collapsible section; it opens by itself when it gets a value (e.g. by paste or undo). The header
 * carries the YAML key, the version badge and the count of set keys; docs link, help and "Clear" sit on its right.
 */
function ObjectSection({ field, value, onChange }: EditorProps<ObjectField>) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const title = useFieldLabel(field);
  const count = countSetValues(value);
  const [isOpen, setIsOpen] = useState(count > 0);
  const [hadValues, setHadValues] = useState(count > 0);
  if (hadValues !== count > 0) {
    setHadValues(count > 0);
    if (count > 0) setIsOpen(true);
  }
  const help = text(field.help);
  const target = useProjectStore((s) => s.project?.target);
  return (
    <CollapsibleSection
      className="col-span-full"
      open={isOpen}
      onOpenChange={setIsOpen}
      title={title}
      meta={
        <>
          {fieldYamlKey(field) && <code className="font-mono text-micro text-text-faint">{fieldYamlKey(field)}</code>}
          <MinVersionBadge field={field} />
          {count > 0 && <span className="font-mono">{t('field.countSet', { count })}</span>}
        </>
      }
      actions={
        <>
          {field.docs && target && <DocsLink url={field.docs} target={target} label={title} />}
          {help && <Help>{help}</Help>}
          {count > 0 && (
            <IconButton label={t('field.clearSection')} size="icon-xs" onClick={() => onChange(undefined)}>
              <X />
            </IconButton>
          )}
        </>
      }
    >
      <ObjectFields field={field} value={value} onChange={(next) => onChange(objectOrUndefined(next))} />
    </CollapsibleSection>
  );
}

/** Top-level objects show their fields directly; nested ones are collapsible sections. */
export function ObjectEditor(props: EditorProps<ObjectField>) {
  return props.root ? <ObjectFields field={props.field} value={props.value} onChange={props.onChange} /> : <ObjectSection {...props} />;
}
