/**
 * Renders a form field from the property schema. Values are stored unchanged
 * in the config object; empty values are returned as undefined.
 *
 * Human-readable strings of the schema (label, help, prose placeholders, option labels, item/key labels)
 * are message keys in the `schema` namespace and are translated here (see useSchemaText).
 */
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, Copy, ImageUp, Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import type { Field, MapField, ObjectField, ObjectListField, StringListField, TextureField } from '@resourcepackbuilder/core/nexo/fields';
import { fieldName, validateTextFormat } from '@resourcepackbuilder/core/nexo/fields';
import type { ModelTexture } from '@resourcepackbuilder/core/types';
import { compareVersions, isPlainObject } from '@resourcepackbuilder/core/util';
import { parseYaml, toYaml } from '@resourcepackbuilder/core/nexo/yaml';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Checkbox } from '../components/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { FieldDescription, FieldError, FieldTitle } from '../components/field';
import { Input } from '../components/input';
import { Label } from '../components/label';
import { Textarea } from '../components/textarea';
import { ToggleGroup, ToggleGroupItem } from '../components/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/tooltip';
import { MiniMessageBox, MiniMessageLine } from '../MiniMessage';
import { AddButton, ColorInput, Datalist, IconButton, ListControls, moveInArray, NumberInput, SelectInput, TextInput, TriState } from './inputs';
import { useSchemaText } from './schemaText';

export interface FieldContextValue {
  minecraftVersion: string;
  /** Uploads a PNG as an extra texture and returns the placeholder "@asset:<id>" */
  uploadAsset: (file: File) => Promise<string | null>;
  getAsset: (token: string) => ModelTexture | undefined;
}

export const FieldContext = createContext<FieldContextValue>({
  minecraftVersion: '99',
  uploadAsset: async () => null,
  getAsset: () => undefined,
});

type Value = unknown;

interface FieldRendererProps {
  field: Field;
  value: Value;
  onChange: (value: Value) => void;
  /** Value of the parent object (for showIf) */
  siblings?: Record<string, unknown>;
  /** Top-level field of a property: booleans without "not set", objects without a frame */
  root?: boolean;
  hideLabel?: boolean;
}

const COMPLEX_TYPES = new Set(['object', 'objectList', 'map', 'yaml', 'stringList', 'multiSelect', 'texture']);

export function isComplexField(field: Field): boolean {
  if (field.type === 'text' && field.multiline) return true;
  return COMPLEX_TYPES.has(field.type);
}

/** Displayed name of a field: the original English name, or the translated label if there is none. */
function useFieldTitle() {
  const text = useSchemaText();
  return (field: { key: string; label: string; name?: string }) => {
    const name = fieldName(field);
    return name === field.label ? (text(name) ?? name) : name;
  };
}

/** Translates a validation message from core (a message key, or plain text while core is being migrated). */
function useFormatError() {
  const issues = useTranslations('issues');
  const text = useSchemaText();
  return (error: string | null) => {
    if (!error) return null;
    return issues.has(error as never) ? issues(error as never) : (text(error) ?? error);
  };
}

const FIELD = 'flex min-w-0 flex-col gap-1.5';
const WIDE = 'col-span-full';

function MinVersionBadge({ version, tooLow }: { version: string; tooLow: boolean }) {
  const t = useTranslations('ui');
  const badge = (
    <Badge variant="outline" className={cn('font-mono font-normal', tooLow ? 'border-warning/50 text-warning' : 'text-muted-foreground')}>
      {t('field.minVersion', { version })}
    </Badge>
  );
  if (!tooLow) return badge;
  return (
    <Tooltip>
      <TooltipTrigger render={badge} />
      <TooltipContent>{t('field.minVersionTooLow', { version })}</TooltipContent>
    </Tooltip>
  );
}

/** Field name with the translated label as tooltip. */
function FieldName({ field, className }: { field: Field; className?: string }) {
  const text = useSchemaText();
  const title = useFieldTitle();
  const name = title(field);
  const description = text(field.label);
  if (!description || description === name) return <span className={className}>{name}</span>;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn('min-w-0 truncate', className)} />}>{name}</TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}

function FieldErrorText({ children }: { children: ReactNode }) {
  return <FieldError className="text-xs leading-4 before:content-['■_']">{children}</FieldError>;
}

export function FieldRenderer({ field, value, onChange, siblings, root, hideLabel }: FieldRendererProps) {
  const ctx = useContext(FieldContext);
  const text = useSchemaText();
  const formatError = useFormatError();
  const title = useFieldTitle();
  if (field.showIf && siblings) {
    const current = siblings[field.showIf.key];
    if (!field.showIf.values.includes(current as string)) return null;
  }
  const versionTooLow = !!field.minVersion && compareVersions(ctx.minecraftVersion, field.minVersion) < 0;

  const label =
    !hideLabel && field.label ? (
      <FieldTitle className="w-full gap-1.5 text-[13px] leading-4">
        <FieldName field={field} />
        {field.minVersion && <MinVersionBadge version={field.minVersion} tooLow={versionTooLow} />}
      </FieldTitle>
    ) : null;
  const help = field.help ? <FieldDescription className="text-xs leading-4">{text(field.help)}</FieldDescription> : null;

  switch (field.type) {
    case 'text': {
      const str = typeof value === 'string' ? value : value === undefined || value === null ? undefined : String(value);
      const error = formatError(str ? validateTextFormat(field.format, str) : null);
      return (
        <div className={cn(FIELD, field.multiline && WIDE)}>
          {label}
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {field.multiline ? (
                <Textarea value={str ?? ''} placeholder={text(field.placeholder)} onChange={(e) => onChange(e.target.value || undefined)} />
              ) : (
                <TextInput value={str} onChange={onChange} placeholder={text(field.placeholder)} suggestions={field.suggestions} invalid={!!error} />
              )}
            </div>
            {field.format === 'color' && <ColorInput value={str} onChange={onChange} />}
          </div>
          {field.format === 'minimessage' && str && (
            <MiniMessageBox className="min-w-0">
              <MiniMessageLine text={str} />
            </MiniMessageBox>
          )}
          {error && <FieldErrorText>{error}</FieldErrorText>}
          {help}
        </div>
      );
    }
    case 'number':
      return (
        <div className={FIELD}>
          {label}
          <NumberInput
            value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
            onChange={onChange}
            placeholder={text(field.placeholder)}
            integer={field.integer}
            min={field.min}
            max={field.max}
            invalid={typeof value === 'number' && ((field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))}
          />
          {help}
        </div>
      );
    case 'boolean':
      return (
        <div className={FIELD}>
          {label}
          <TriState value={typeof value === 'boolean' ? value : undefined} onChange={onChange} allowUnset={!root} defaultHint={field.defaultHint} />
          {help}
        </div>
      );
    case 'select':
      return (
        <div className={FIELD}>
          {label}
          <SelectInput
            value={typeof value === 'string' ? value : undefined}
            onChange={onChange}
            options={field.options}
            allowCustom={field.allowCustom}
            placeholder={field.placeholder}
          />
          {help}
        </div>
      );
    case 'stringList':
      return (
        <div className={cn(FIELD, WIDE)}>
          {label}
          <StringListEditor field={field} value={value} onChange={onChange} />
          {help}
        </div>
      );
    case 'multiSelect': {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className={cn(FIELD, WIDE)}>
          {label}
          <ToggleGroup
            multiple
            className="flex-wrap"
            value={list}
            onValueChange={(next: string[]) => {
              const added = next.find((v) => !list.includes(v));
              const result = added !== undefined ? [...list, added] : list.filter((v) => next.includes(v));
              onChange(result.length ? result : undefined);
            }}
          >
            {field.options.map((o) => (
              <ToggleGroupItem
                key={o.value}
                value={o.value}
                size="sm"
                variant="outline"
                className="h-6 rounded-full px-2.5 text-xs font-normal data-pressed:border-primary data-pressed:bg-accent data-pressed:text-primary"
              >
                {o.label ? text(o.label) : o.value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {help}
        </div>
      );
    }
    case 'presence':
      return (
        <Label className="col-span-full cursor-pointer items-start gap-2.5 py-1.5 text-sm leading-5 font-normal">
          <Checkbox className="mt-0.5" checked={isPlainObject(value) || value === true} onCheckedChange={(checked) => onChange(checked ? {} : undefined)} />
          <span className="flex min-w-0 flex-col">
            <FieldName field={field} />
            {field.help && <span className="text-xs leading-4 text-muted-foreground">{text(field.help)}</span>}
          </span>
        </Label>
      );
    case 'yaml':
      return (
        <div className={cn(FIELD, WIDE)}>
          {label}
          <YamlInput value={value} onChange={onChange} placeholder={text(field.placeholder)} />
          {help}
        </div>
      );
    case 'texture':
      return (
        <div className={cn(FIELD, WIDE)}>
          {label}
          <TextureInput field={field} value={value} onChange={onChange} />
          {help}
        </div>
      );
    case 'object':
      return root ? (
        <ObjectFields field={field} value={value} onChange={onChange} />
      ) : (
        <ObjectSection field={field} value={value} onChange={onChange} versionTooLow={versionTooLow} title={title(field)} />
      );
    case 'objectList':
      return (
        <div className={cn(FIELD, WIDE)}>
          {label}
          <ObjectListEditor field={field} value={value} onChange={onChange} />
          {help}
        </div>
      );
    case 'map':
      return (
        <div className={cn(FIELD, WIDE)}>
          {label}
          <MapEditor field={field} value={value} onChange={onChange} />
          {help}
        </div>
      );
  }
}

/* ====================================================================== Objects */

function countValues(value: unknown): number {
  if (!isPlainObject(value)) return 0;
  return Object.values(value).filter((v) => v !== undefined && v !== null && v !== '').length;
}

/** Fields of an object in a grid (simple fields) or full width (complex fields). */
export function ObjectFields({ field, value, onChange }: { field: ObjectField; value: unknown; onChange: (v: unknown) => void }) {
  const obj = isPlainObject(value) ? value : {};
  const known = new Set(field.fields.map((f) => f.key));
  const setChild = (key: string, childValue: unknown) => {
    const next: Record<string, unknown> = { ...obj };
    if (childValue === undefined) delete next[key];
    else next[key] = childValue;
    onChange(next);
  };
  const setRest = (rest: unknown) => {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) if (known.has(k) && k !== '*') next[k] = v;
    if (isPlainObject(rest)) Object.assign(next, rest);
    onChange(next);
  };
  const simple = field.fields.filter((f) => !isComplexField(f) && f.type !== 'presence');
  const complex = field.fields.filter((f) => isComplexField(f) || f.type === 'presence');
  return (
    <div className="flex flex-col gap-3">
      {simple.length > 0 && (
        <FieldGroup>
          {simple.map((f) => (
            <FieldRenderer key={f.key} field={f} value={obj[f.key]} siblings={obj} onChange={(v) => setChild(f.key, v)} />
          ))}
        </FieldGroup>
      )}
      {complex.map((f) => {
        if (f.key === '*') {
          const rest: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(obj)) if (!known.has(k)) rest[k] = v;
          return <FieldRenderer key="*" field={f} value={rest} siblings={obj} onChange={setRest} />;
        }
        return <FieldRenderer key={f.key} field={f} value={obj[f.key]} siblings={obj} onChange={(v) => setChild(f.key, v)} />;
      })}
    </div>
  );
}

function ObjectSection({
  field,
  value,
  onChange,
  versionTooLow,
  title,
}: {
  field: ObjectField;
  value: unknown;
  onChange: (v: unknown) => void;
  versionTooLow: boolean;
  title: string;
}) {
  const t = useTranslations('ui');
  const text = useSchemaText();
  const count = countValues(value);
  const [open, setOpen] = useState(count > 0);
  const description = text(field.label);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('col-span-full rounded-md border transition-colors', open ? 'border-input' : 'border-border')}
    >
      <div className="flex items-center gap-2 pr-2 hover:bg-muted/60">
        <CollapsibleTrigger
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md py-2.5 pl-3 text-left font-heading text-[13px] leading-4 font-semibold tracking-[0.06em] text-foreground uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          title={description && description !== title ? description : undefined}
        >
          <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
          <span className="truncate">{title}</span>
          {field.minVersion && <MinVersionBadge version={field.minVersion} tooLow={versionTooLow} />}
          {count > 0 && (
            <span className="ml-auto font-mono text-xs font-normal tracking-normal text-muted-foreground normal-case">
              {t('field.countSet', { count })}
            </span>
          )}
        </CollapsibleTrigger>
        {count > 0 && (
          <IconButton label={t('field.clearSection')} size="icon-xs" onClick={() => onChange(undefined)}>
            <X />
          </IconButton>
        )}
      </div>
      <CollapsibleContent className="px-3 pt-1 pb-3">
        {field.help && <FieldDescription className="mb-2.5 text-xs leading-4">{text(field.help)}</FieldDescription>}
        <ObjectFields
          field={field}
          value={value}
          onChange={(v) => onChange(isPlainObject(v) && Object.keys(v).length === 0 ? undefined : v)}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ====================================================================== Lists */

function EntryCard({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/40">
      <div className="flex items-center gap-1.5 border-b border-border py-1.5 pr-2 pl-3 text-sm leading-5 font-semibold text-foreground">{header}</div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function StringListEditor({ field, value, onChange }: { field: StringListField; value: unknown; onChange: (v: unknown) => void }) {
  const t = useTranslations('ui');
  const text = useSchemaText();
  const formatError = useFormatError();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const list: string[] = Array.isArray(value) ? value.map((v) => (v === null || v === undefined ? '' : String(v))) : typeof value === 'string' ? [value] : [];
  const commit = (next: string[]) => onChange(next.length ? next : undefined);
  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {list.map((entry, i) => {
        const error = formatError(entry ? validateTextFormat(field.format, entry) : null);
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <Input
                className="min-w-0 flex-1"
                aria-invalid={!!error || undefined}
                value={entry}
                list={field.suggestions?.length ? listId : undefined}
                placeholder={text(field.placeholder)}
                spellCheck={false}
                onChange={(e) => {
                  const next = [...list];
                  next[i] = e.target.value;
                  commit(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const next = [...list];
                    next.splice(i + 1, 0, '');
                    commit(next);
                    window.setTimeout(() => {
                      const inputs = containerRef.current?.querySelectorAll('input');
                      (inputs?.[i + 1] as HTMLInputElement | undefined)?.focus();
                    });
                  }
                }}
              />
              <ListControls
                index={i}
                count={list.length}
                onMove={(from, to) => commit(moveInArray(list, from, to))}
                onRemove={() => commit(list.filter((_, j) => j !== i))}
              />
            </div>
            {field.format === 'minimessage' && entry && (
              <MiniMessageBox className="min-w-0">
                <MiniMessageLine text={entry} fallbackColor="#AA00AA" defaultItalic />
              </MiniMessageBox>
            )}
            {error && <FieldErrorText>{error}</FieldErrorText>}
          </div>
        );
      })}
      <Datalist id={listId} options={field.suggestions} />
      <AddButton label={t('field.addEntry')} onClick={() => onChange([...list, ''])} />
    </div>
  );
}

function ObjectListEditor({ field, value, onChange }: { field: ObjectListField; value: unknown; onChange: (v: unknown) => void }) {
  const t = useTranslations('ui');
  const common = useTranslations('common');
  const text = useSchemaText();
  const itemLabel = text(field.itemLabel) ?? field.itemLabel;
  const list = Array.isArray(value) ? (value as unknown[]) : [];
  const commit = (next: unknown[]) => onChange(next.length ? next : undefined);
  const objectField: ObjectField = { type: 'object', key: '', label: '', fields: field.fields };
  return (
    <div className="flex flex-col gap-2.5">
      {list.map((entry, i) => {
        const obj = isPlainObject(entry) ? entry : {};
        const title = field.titleKey && typeof obj[field.titleKey] === 'string' && obj[field.titleKey] ? String(obj[field.titleKey]) : '';
        return (
          <EntryCard
            key={i}
            header={
              <>
                <span className="min-w-0 flex-1 truncate">
                  {itemLabel} {i + 1}
                  {title && <span className="font-normal text-muted-foreground"> · {title}</span>}
                </span>
                <IconButton
                  label={common('duplicate')}
                  onClick={() => {
                    const next = [...list];
                    next.splice(i + 1, 0, JSON.parse(JSON.stringify(entry ?? {})));
                    commit(next);
                  }}
                >
                  <Copy />
                </IconButton>
                <ListControls
                  index={i}
                  count={list.length}
                  onMove={(from, to) => commit(moveInArray(list, from, to))}
                  onRemove={() => commit(list.filter((_, j) => j !== i))}
                />
              </>
            }
          >
            <ObjectFields
              field={objectField}
              value={obj}
              onChange={(v) => {
                const next = [...list];
                next[i] = v;
                commit(next);
              }}
            />
          </EntryCard>
        );
      })}
      <AddButton label={t('field.addItem', { item: itemLabel })} onClick={() => onChange([...list, field.newItem?.() ?? {}])} />
    </div>
  );
}

function MapEditor({ field, value, onChange }: { field: MapField; value: unknown; onChange: (v: unknown) => void }) {
  const t = useTranslations('ui');
  const common = useTranslations('common');
  const text = useSchemaText();
  const keyLabel = text(field.keyLabel) ?? field.keyLabel;
  const obj = isPlainObject(value) ? value : {};
  const entries = Object.entries(obj).filter(([k]) => !field.reservedKeys?.includes(k));
  const [newKey, setNewKey] = useState('');
  const listId = useId();
  const valueIsSimple = !isComplexField(field.value);
  const keyTaken = newKey.trim() !== '' && (newKey.trim() in obj || !!field.reservedKeys?.includes(newKey.trim()));

  const commit = (next: Record<string, unknown>) => onChange(Object.keys(next).length ? next : undefined);
  const rename = (oldKey: string, nextKey: string) => {
    if (!nextKey || nextKey === oldKey || nextKey in obj) return;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) next[k === oldKey ? nextKey : k] = v;
    commit(next);
  };
  const add = () => {
    const key = newKey.trim();
    if (!key || keyTaken) return;
    commit({ ...obj, [key]: field.newValue?.() ?? (field.value.type === 'object' ? {} : '') });
    setNewKey('');
  };
  const remove = (key: string) => {
    const next = { ...obj };
    delete next[key];
    commit(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([key, entry]) =>
        valueIsSimple ? (
          <div key={key} className="flex items-start gap-2">
            <KeyInput value={key} onRename={(k) => rename(key, k)} listId={listId} />
            <div className="min-w-0 flex-1">
              <FieldRenderer field={{ ...field.value, label: '' }} value={entry} hideLabel onChange={(v) => commit({ ...obj, [key]: v })} />
            </div>
            <IconButton label={common('remove')} danger onClick={() => remove(key)}>
              <Trash2 />
            </IconButton>
          </div>
        ) : (
          <EntryCard
            key={key}
            header={
              <>
                <KeyInput value={key} onRename={(k) => rename(key, k)} listId={listId} />
                <span className="flex-1" />
                <IconButton label={common('remove')} danger onClick={() => remove(key)}>
                  <Trash2 />
                </IconButton>
              </>
            }
          >
            {field.value.type === 'object' ? (
              <ObjectFields field={field.value} value={entry} onChange={(v) => commit({ ...obj, [key]: v ?? {} })} />
            ) : (
              <FieldRenderer field={field.value} value={entry} hideLabel onChange={(v) => commit({ ...obj, [key]: v })} />
            )}
          </EntryCard>
        ),
      )}
      <div className="flex items-start gap-2">
        <Input
          className="min-w-0 flex-1"
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
        <Button type="button" variant="outline" onClick={add} disabled={!newKey.trim() || keyTaken}>
          <Plus /> {t('field.addItem', { item: keyLabel })}
        </Button>
      </div>
      {keyTaken && <FieldErrorText>{t('field.keyTaken', { key: newKey.trim() })}</FieldErrorText>}
      <Datalist id={listId} options={field.keyOptions?.filter((o) => !(o.value in obj))} />
    </div>
  );
}

function KeyInput({ value, onRename, listId }: { value: string; onRename: (key: string) => void; listId: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Input
      className="w-[220px] flex-none font-mono"
      value={draft}
      list={listId}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const key = draft.trim();
        if (key && key !== value) onRename(key);
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      spellCheck={false}
    />
  );
}

/* ====================================================================== YAML & textures */

export function YamlInput({
  value,
  onChange,
  placeholder,
  rows = 6,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  placeholder?: string;
  rows?: number;
}) {
  const t = useTranslations('ui');
  const toText = (v: unknown) => (v === undefined || v === null ? '' : toYaml(v).trimEnd());
  const [text, setText] = useState(() => toText(value));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Apply external changes (e.g. undo) as long as the text is valid
    const parsed = parseYaml(text);
    if (!parsed.error && JSON.stringify(parsed.value ?? null) !== JSON.stringify(value ?? null)) {
      setText(toText(value));
    }
  }, [value]);
  return (
    <>
      <Textarea
        className="field-sizing-fixed font-mono text-xs leading-5 [tab-size:2]"
        aria-invalid={!!error || undefined}
        rows={rows}
        value={text}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const parsed = parseYaml(next);
          setError(parsed.error);
          if (!parsed.error) onChange(parsed.value === null ? undefined : parsed.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const el = e.target as HTMLTextAreaElement;
            const { selectionStart, selectionEnd } = el;
            const next = text.slice(0, selectionStart) + '  ' + text.slice(selectionEnd);
            setText(next);
            window.requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
          }
        }}
      />
      {error && <FieldErrorText>{t('field.yamlError', { error })}</FieldErrorText>}
    </>
  );
}

function TextureInput({ field, value, onChange }: { field: TextureField; value: unknown; onChange: (v: unknown) => void }) {
  const t = useTranslations('ui');
  const common = useTranslations('common');
  const ctx = useContext(FieldContext);
  const fileRef = useRef<HTMLInputElement>(null);
  const texture = typeof value === 'string' ? ctx.getAsset(value) : undefined;
  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const token = await ctx.uploadAsset(file);
    if (token) onChange(token);
  };
  return (
    <div className="flex max-w-[520px] gap-3 rounded-md border border-border bg-muted/40 p-3">
      <div className="grid size-16 flex-none place-items-center overflow-hidden rounded-sm bg-background bg-[repeating-conic-gradient(var(--color-border)_0_25%,transparent_0_50%)] [background-size:12px_12px]">
        {texture?.dataUrl ? (
          <img src={texture.dataUrl} alt="" className="max-h-full max-w-full [image-rendering:pixelated]" />
        ) : (
          <ImageUp className="size-5.5 text-muted-foreground" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {texture ? (
          <>
            <strong className="truncate text-[13px] leading-[18px] font-semibold">{texture.name}.png</strong>
            <span className="text-[13px] leading-[18px] text-muted-foreground">
              {texture.width}×{texture.height} px
            </span>
          </>
        ) : (
          <span className="text-[13px] leading-[18px] text-muted-foreground">
            {field.sizeHint ? t('field.noTextureHint', { size: field.sizeHint }) : t('field.noTexture')}
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImageUp /> {texture ? t('field.replace') : t('field.uploadPng')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".png,image/png"
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
          {texture && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onChange(undefined)}>
              <Trash2 /> {common('remove')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">{children}</div>;
}
