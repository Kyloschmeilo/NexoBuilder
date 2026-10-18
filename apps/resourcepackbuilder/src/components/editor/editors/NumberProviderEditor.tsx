/**
 * A number provider: a plain value (a number, a range like `1~3` or an expression, stored as typed; the export writes
 * numeric text as a number) or a typed object such as `{ type: uniform, min, max }` with the fields of its type.
 *
 * The plain value is one input with a button that turns it into a number type, picked from the catalog (fixed values,
 * ranges, distributions). A typed value shows its type as a button that picks another, its docs link, the type's
 * fields below a hairline, and a button back to a plain value. Switching carries the value over where it can: `1~3`
 * becomes `uniform` 1 to 3 and back, a number becomes `constant`.
 */
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Dices, Undo2 } from 'lucide-react';
import { findTypedType, type NumberProviderField, type ObjectField, type TypedType, type YamlField } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { DocsLink, IconButton } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { catalogFromTypedSource, typedTypeLabel } from '../../catalog/adapters';
import { CatalogDialog } from '../../catalog/CatalogDialog';
import { categoryIcon } from '../../catalog/categoryIcons';
import { useCatalogText } from '../../catalog/useCatalogText';
import { useFormTarget } from '../../formTarget';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import { TextInput } from '../inputs/TextInput';
import type { EditorProps } from '../types';
import { withEntryType } from '../values';
import { ObjectFields } from './ObjectEditor';
import { YamlEditor } from './YamlEditor';

const ENTRY_YAML: YamlField = { type: 'yaml', key: '', label: '' };

const NUMBER = /^\s*-?\d+(\.\d+)?\s*$/;
const RANGE = /^\s*(-?\d+(?:\.\d+)?)\s*~\s*(-?\d+(?:\.\d+)?)\s*$/;

/** Whether a value is a plain number, or text that is one. */
function isNumeric(value: unknown): value is number | string {
  return (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && NUMBER.test(value));
}

/**
 * The typed value a number provider takes when `type` is picked for it: an object keeps the keys the new type has
 * too; a range `a~b` becomes `uniform` (or `triangle`) from a to b; a value becomes the `value` of `constant` or
 * `fixed`, an expression the `expression` of `expression`; anything else starts empty.
 */
export function toTypedNumber(value: unknown, type: string, known?: TypedType): Record<string, unknown> {
  if (isPlainObject(value)) return withEntryType(value, type, known);
  const range = typeof value === 'string' ? RANGE.exec(value) : null;
  if (range && (type === 'uniform' || type === 'triangle')) return { type, min: Number(range[1]), max: Number(range[2]) };
  if ((type === 'constant' || type === 'fixed') && (typeof value === 'number' || (typeof value === 'string' && value.trim())))
    return { type, value: String(value).trim() };
  if (type === 'expression' && typeof value === 'string' && value.trim() && !NUMBER.test(value) && !range)
    return { type, expression: value.trim() };
  return { type };
}

/**
 * The plain value of a typed number provider, where it has one: `constant`/`fixed` give their value (a number when it
 * is one), `uniform` with plain bounds gives `min~max`, `expression` its expression; undefined otherwise.
 */
export function toPlainNumber(value: unknown): number | string | undefined {
  if (!isPlainObject(value)) return undefined;
  const { type } = value;
  if ((type === 'constant' || type === 'fixed') && (typeof value.value === 'string' || typeof value.value === 'number')) {
    return isNumeric(value.value) ? Number(value.value) : value.value;
  }
  if (type === 'uniform' && isNumeric(value.min) && isNumeric(value.max)) return `${Number(value.min)}~${Number(value.max)}`;
  if (type === 'expression' && typeof value.expression === 'string' && value.expression.trim()) return value.expression;
  return undefined;
}

export function NumberProviderEditor({ field, value, onChange, hideLabel }: EditorProps<NumberProviderField>) {
  const t = useTranslations('editor');
  const text = useSchemaText();
  const catalogText = useCatalogText();
  const target = useFormTarget() ?? 'craftengine';
  const [picking, setPicking] = useState(false);
  const known = findTypedType(field, value);
  const catalog = useMemo(() => catalogFromTypedSource(field, { text: catalogText, target }), [field, catalogText, target]);
  const pick = ([type]: string[]) => {
    if (!type) return;
    onChange(
      toTypedNumber(
        value,
        type,
        field.types().find((candidate) => candidate.type === type),
      ),
    );
  };

  let body;
  if (isPlainObject(value)) {
    const name = typeof value.type === 'string' ? value.type : '';
    const label = known ? typedTypeLabel(known, { schema: text }) : name || t('typedList.number.title');
    const help = known?.help ? text(known.help) : undefined;
    const fields: ObjectField | undefined = known && { type: 'object', key: '', label: '', fields: known.fields };
    // Types without a plain form (a distribution) keep their value: the button is off then
    const plain = toPlainNumber(value);
    body = (
      <div data-slot="number-provider" data-type={name || undefined} className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="min-w-0" onClick={() => setPicking(true)}>
            <span aria-hidden className="text-primary [&_svg]:size-3.5">
              {categoryIcon(known?.category)}
            </span>
            <span className="truncate">{label}</span>
            <ChevronDown className="text-text-muted" aria-hidden />
            <span className="sr-only">{t('typedList.number.changeType')}</span>
          </Button>
          {name && <code className="hidden truncate font-mono text-micro text-text-faint @md/field:block">{name}</code>}
          <span className="flex-1" />
          {known?.docs && <DocsLink url={known.docs} target={target} label={label} />}
          <IconButton
            label={plain === undefined ? t('typedList.number.noPlainValue') : t('typedList.number.useValue')}
            size="icon-sm"
            disabled={plain === undefined}
            onClick={() => onChange(plain)}
          >
            <Undo2 />
          </IconButton>
        </div>
        {(help || (fields && fields.fields.length > 0) || (!known && name)) && (
          <div className="flex min-w-0 flex-col gap-2 border-l-2 border-line pl-3">
            {help && <p className="text-meta text-text-muted">{help}</p>}
            {fields && fields.fields.length > 0 && <ObjectFields field={fields} value={value} onChange={onChange} />}
            {!known && name && <YamlEditor field={ENTRY_YAML} value={value} onChange={onChange} hideLabel />}
          </div>
        )}
      </div>
    );
  } else {
    const scalar = typeof value === 'number' || typeof value === 'boolean' ? String(value) : typeof value === 'string' ? value : undefined;
    body = (
      <div data-slot="number-provider" className="flex min-w-0 items-center gap-1.5">
        <TextInput className="min-w-0 flex-1" mono value={scalar} onChange={onChange} placeholder={t('typed.valuePlaceholder')} />
        <IconButton label={t('typedList.number.useType')} size="icon-sm" onClick={() => setPicking(true)}>
          <Dices />
        </IconButton>
      </div>
    );
  }

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide={isPlainObject(value)}>
      <div className="@container/field min-w-0">{body}</div>
      <CatalogDialog
        open={picking}
        onOpenChange={setPicking}
        title={t('typedList.number.title')}
        {...catalog}
        initialCategory={known?.category}
        addLabel={t('typedList.number.useType')}
        onAdd={pick}
      />
    </FieldShell>
  );
}
