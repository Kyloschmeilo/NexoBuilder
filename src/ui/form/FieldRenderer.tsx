/**
 * Rendert ein Formularfeld aus dem Eigenschafts-Schema. Werte werden unverändert
 * im Konfigurationsobjekt gespeichert; leere Werte werden als undefined zurückgegeben.
 */
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { ChevronRight, Copy, ImageUp, Plus, Trash2, X } from 'lucide-react';
import type { Field, MapField, ObjectField, ObjectListField, StringListField, TextureField } from '../../core/nexo/fields';
import { validateTextFormat } from '../../core/nexo/fields';
import type { ModelTexture } from '../../core/types';
import { compareVersions, isPlainObject } from '../../core/util';
import { parseYaml, toYaml } from '../../core/nexo/yaml';
import { MiniMessageLine } from '../common/MiniMessage';
import { AddButton, ColorInput, Datalist, ListControls, moveInArray, NumberInput, SelectInput, TextInput, TriState } from './inputs';

export interface FieldContextValue {
  minecraftVersion: string;
  /** Lädt eine PNG als Zusatz-Textur hoch und gibt den Platzhalter "@asset:<id>" zurück */
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
  /** Wert des übergeordneten Objekts (für showIf) */
  siblings?: Record<string, unknown>;
  /** Oberstes Feld einer Eigenschaft: Booleans ohne „nicht gesetzt“, Objekte ohne Rahmen */
  root?: boolean;
  hideLabel?: boolean;
}

const COMPLEX_TYPES = new Set(['object', 'objectList', 'map', 'yaml', 'stringList', 'multiSelect', 'texture']);

export function isComplexField(field: Field): boolean {
  if (field.type === 'text' && field.multiline) return true;
  return COMPLEX_TYPES.has(field.type);
}

export function FieldRenderer({ field, value, onChange, siblings, root, hideLabel }: FieldRendererProps) {
  const ctx = useContext(FieldContext);
  if (field.showIf && siblings) {
    const current = siblings[field.showIf.key];
    if (!field.showIf.values.includes(current as string)) return null;
  }
  const versionTooLow = field.minVersion && compareVersions(ctx.minecraftVersion, field.minVersion) < 0;

  const label = !hideLabel && field.label ? (
    <span className="field-label">
      {field.label}
      {field.minVersion && <span className={`badge ${versionTooLow ? 'warning' : ''}`}>ab {field.minVersion}</span>}
    </span>
  ) : null;
  const help = field.help ? <span className="field-help">{field.help}</span> : null;

  switch (field.type) {
    case 'text': {
      const str = typeof value === 'string' ? value : value === undefined || value === null ? undefined : String(value);
      const error = str ? validateTextFormat(field.format, str) : null;
      return (
        <div className={`field ${field.multiline ? 'wide' : ''}`}>
          {label}
          <div className="row">
            <div className="grow">
              {field.multiline ? (
                <textarea className="textarea" value={str ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value || undefined)} />
              ) : (
                <TextInput value={str} onChange={onChange} placeholder={field.placeholder} suggestions={field.suggestions} invalid={!!error} />
              )}
            </div>
            {field.format === 'color' && <ColorInput value={str} onChange={onChange} />}
          </div>
          {field.format === 'minimessage' && str && (
            <div className="mc-text" style={{ minWidth: 0 }}>
              <MiniMessageLine text={str} />
            </div>
          )}
          {error && <span className="field-error">{error}</span>}
          {help}
        </div>
      );
    }
    case 'number':
      return (
        <div className="field">
          {label}
          <NumberInput
            value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
            onChange={onChange}
            placeholder={field.placeholder}
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
        <div className="field">
          {label}
          <TriState
            value={typeof value === 'boolean' ? value : undefined}
            onChange={onChange}
            allowUnset={!root}
            defaultHint={field.defaultHint}
          />
          {help}
        </div>
      );
    case 'select':
      return (
        <div className="field">
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
        <div className="field wide">
          {label}
          <StringListEditor field={field} value={value} onChange={onChange} />
          {help}
        </div>
      );
    case 'multiSelect': {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="field wide">
          {label}
          <div className="chips">
            {field.options.map((o) => {
              const active = list.includes(o.value);
              return (
                <span
                  key={o.value}
                  className={`chip ${active ? 'active' : ''}`}
                  onClick={() => {
                    const next = active ? list.filter((v) => v !== o.value) : [...list, o.value];
                    onChange(next.length ? next : undefined);
                  }}
                >
                  {o.label ?? o.value}
                </span>
              );
            })}
          </div>
          {help}
        </div>
      );
    }
    case 'presence':
      return (
        <label className="toggle-row">
          <input type="checkbox" checked={isPlainObject(value) || value === true} onChange={(e) => onChange(e.target.checked ? {} : undefined)} />
          <span>
            {field.label}
            {field.help && <div className="tr-desc">{field.help}</div>}
          </span>
        </label>
      );
    case 'yaml':
      return (
        <div className="field wide">
          {label}
          <YamlInput value={value} onChange={onChange} placeholder={field.placeholder} />
          {help}
        </div>
      );
    case 'texture':
      return (
        <div className="field wide">
          {label}
          <TextureInput field={field} value={value} onChange={onChange} />
          {help}
        </div>
      );
    case 'object':
      return root ? (
        <ObjectFields field={field} value={value} onChange={onChange} />
      ) : (
        <ObjectSection field={field} value={value} onChange={onChange} versionTooLow={!!versionTooLow} />
      );
    case 'objectList':
      return (
        <div className="field wide">
          {label}
          <ObjectListEditor field={field} value={value} onChange={onChange} />
          {help}
        </div>
      );
    case 'map':
      return (
        <div className="field wide">
          {label}
          <MapEditor field={field} value={value} onChange={onChange} />
          {help}
        </div>
      );
  }
}

/* ====================================================================== Objekte */

function countValues(value: unknown): number {
  if (!isPlainObject(value)) return 0;
  return Object.values(value).filter((v) => v !== undefined && v !== null && v !== '').length;
}

/** Felder eines Objekts im Raster (einfache Felder) bzw. volle Breite (komplexe Felder). */
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
    <div className="col" style={{ gap: 12 }}>
      {simple.length > 0 && (
        <div className="field-grid">
          {simple.map((f) => (
            <FieldRenderer key={f.key} field={f} value={obj[f.key]} siblings={obj} onChange={(v) => setChild(f.key, v)} />
          ))}
        </div>
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
}: {
  field: ObjectField;
  value: unknown;
  onChange: (v: unknown) => void;
  versionTooLow: boolean;
}) {
  const count = countValues(value);
  const [open, setOpen] = useState(count > 0);
  return (
    <details className="subsection" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        <ChevronRight size={14} className="chev" />
        {field.label}
        {field.minVersion && <span className={`badge ${versionTooLow ? 'warning' : ''}`}>ab {field.minVersion}</span>}
        {count > 0 && <span className="count">{count} gesetzt</span>}
        {count > 0 && (
          <button
            className="btn ghost icon small"
            title="Abschnitt leeren"
            style={{ marginLeft: count > 0 ? 6 : 'auto' }}
            onClick={(e) => {
              e.preventDefault();
              onChange(undefined);
            }}
          >
            <X size={13} />
          </button>
        )}
      </summary>
      {open && (
        <div className="subsection-body">
          {field.help && (
            <div className="field-help" style={{ marginBottom: 10 }}>
              {field.help}
            </div>
          )}
          <ObjectFields
            field={field}
            value={value}
            onChange={(v) => onChange(isPlainObject(v) && Object.keys(v).length === 0 ? undefined : v)}
          />
        </div>
      )}
    </details>
  );
}

/* ====================================================================== Listen */

function StringListEditor({ field, value, onChange }: { field: StringListField; value: unknown; onChange: (v: unknown) => void }) {
  const listId = useId();
  const list: string[] = Array.isArray(value) ? value.map((v) => (v === null || v === undefined ? '' : String(v))) : typeof value === 'string' ? [value] : [];
  const commit = (next: string[]) => onChange(next.length ? next : undefined);
  return (
    <div className="list-editor">
      {list.map((entry, i) => {
        const error = entry ? validateTextFormat(field.format, entry) : null;
        return (
          <div key={i} className="col" style={{ gap: 4 }}>
            <div className="list-row">
              <input
                className={`input grow ${error ? 'invalid' : ''}`}
                value={entry}
                list={field.suggestions?.length ? listId : undefined}
                placeholder={field.placeholder}
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
                      const inputs = (e.target as HTMLElement).closest('.list-editor')?.querySelectorAll('input');
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
              <div className="mc-text" style={{ minWidth: 0 }}>
                <MiniMessageLine text={entry} fallbackColor="#AA00AA" defaultItalic />
              </div>
            )}
            {error && <span className="field-error">{error}</span>}
          </div>
        );
      })}
      <Datalist id={listId} options={field.suggestions} />
      <AddButton label="Eintrag hinzufügen" onClick={() => onChange([...list, ''])} />
    </div>
  );
}

function ObjectListEditor({ field, value, onChange }: { field: ObjectListField; value: unknown; onChange: (v: unknown) => void }) {
  const list = Array.isArray(value) ? (value as unknown[]) : [];
  const commit = (next: unknown[]) => onChange(next.length ? next : undefined);
  const objectField: ObjectField = { type: 'object', key: '', label: '', fields: field.fields };
  return (
    <div className="list-editor" style={{ gap: 10 }}>
      {list.map((entry, i) => {
        const obj = isPlainObject(entry) ? entry : {};
        const title = field.titleKey && typeof obj[field.titleKey] === 'string' && obj[field.titleKey] ? String(obj[field.titleKey]) : '';
        return (
          <div key={i} className="entry-card">
            <div className="entry-card-header">
              <span className="title">
                {field.itemLabel} {i + 1}
                {title && <span className="faint"> · {title}</span>}
              </span>
              <button
                className="btn ghost icon small"
                title="Duplizieren"
                onClick={() => {
                  const next = [...list];
                  next.splice(i + 1, 0, JSON.parse(JSON.stringify(entry ?? {})));
                  commit(next);
                }}
              >
                <Copy size={13} />
              </button>
              <ListControls
                index={i}
                count={list.length}
                onMove={(from, to) => commit(moveInArray(list, from, to))}
                onRemove={() => commit(list.filter((_, j) => j !== i))}
              />
            </div>
            <div className="entry-card-body">
              <ObjectFields
                field={objectField}
                value={obj}
                onChange={(v) => {
                  const next = [...list];
                  next[i] = v;
                  commit(next);
                }}
              />
            </div>
          </div>
        );
      })}
      <AddButton label={`${field.itemLabel} hinzufügen`} onClick={() => onChange([...list, field.newItem?.() ?? {}])} />
    </div>
  );
}

function MapEditor({ field, value, onChange }: { field: MapField; value: unknown; onChange: (v: unknown) => void }) {
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

  return (
    <div className="list-editor" style={{ gap: 8 }}>
      {entries.map(([key, entry]) =>
        valueIsSimple ? (
          <div key={key} className="list-row">
            <KeyInput value={key} onRename={(k) => rename(key, k)} listId={listId} />
            <div className="grow">
              <FieldRenderer field={{ ...field.value, label: '' }} value={entry} hideLabel onChange={(v) => commit({ ...obj, [key]: v })} />
            </div>
            <button
              className="btn ghost icon small danger"
              title="Entfernen"
              onClick={() => {
                const next = { ...obj };
                delete next[key];
                commit(next);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <div key={key} className="entry-card">
            <div className="entry-card-header">
              <KeyInput value={key} onRename={(k) => rename(key, k)} listId={listId} />
              <span className="spacer" />
              <button
                className="btn ghost icon small danger"
                title="Entfernen"
                onClick={() => {
                  const next = { ...obj };
                  delete next[key];
                  commit(next);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="entry-card-body">
              {field.value.type === 'object' ? (
                <ObjectFields field={field.value} value={entry} onChange={(v) => commit({ ...obj, [key]: v ?? {} })} />
              ) : (
                <FieldRenderer field={field.value} value={entry} hideLabel onChange={(v) => commit({ ...obj, [key]: v })} />
              )}
            </div>
          </div>
        ),
      )}
      <div className="list-row">
        <input
          className={`input grow ${keyTaken ? 'invalid' : ''}`}
          placeholder={field.keyPlaceholder ?? field.keyLabel}
          value={newKey}
          list={field.keyOptions?.length ? listId : undefined}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          spellCheck={false}
        />
        <button className="btn" onClick={add} disabled={!newKey.trim() || keyTaken}>
          <Plus size={14} /> {field.keyLabel} hinzufügen
        </button>
      </div>
      {keyTaken && <span className="field-error">„{newKey.trim()}“ ist bereits vorhanden.</span>}
      <Datalist id={listId} options={field.keyOptions?.filter((o) => !(o.value in obj))} />
    </div>
  );
}

function KeyInput({ value, onRename, listId }: { value: string; onRename: (key: string) => void; listId: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      className="input mono"
      style={{ width: 220, flex: 'none' }}
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

/* ====================================================================== YAML & Texturen */

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
  const toText = (v: unknown) => (v === undefined || v === null ? '' : toYaml(v).trimEnd());
  const [text, setText] = useState(() => toText(value));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Externe Änderungen (z.B. Rückgängig) übernehmen, solange der Text gültig ist
    const parsed = parseYaml(text);
    if (!parsed.error && JSON.stringify(parsed.value ?? null) !== JSON.stringify(value ?? null)) {
      setText(toText(value));
    }
  }, [value]);
  return (
    <>
      <textarea
        className={`textarea ${error ? 'invalid' : ''}`}
        rows={rows}
        value={text}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          const parsed = parseYaml(t);
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
      {error && <span className="field-error">YAML-Fehler: {error}</span>}
    </>
  );
}

function TextureInput({ field, value, onChange }: { field: TextureField; value: unknown; onChange: (v: unknown) => void }) {
  const ctx = useContext(FieldContext);
  const texture = typeof value === 'string' ? ctx.getAsset(value) : undefined;
  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const token = await ctx.uploadAsset(file);
    if (token) onChange(token);
  };
  const inputId = useId();
  return (
    <div className="texture-card" style={{ maxWidth: 520 }}>
      <div className="texture-thumb">{texture?.dataUrl ? <img src={texture.dataUrl} alt="" /> : <ImageUp size={22} className="faint" />}</div>
      <div className="texture-info">
        {texture ? (
          <>
            <strong className="small">{texture.name}.png</strong>
            <span className="faint small">
              {texture.width}×{texture.height} px
            </span>
          </>
        ) : (
          <span className="faint small">Noch keine Textur{field.sizeHint ? ` (empfohlen: ${field.sizeHint})` : ''}</span>
        )}
        <div className="row">
          <label className="btn small" htmlFor={inputId}>
            <ImageUp size={14} /> {texture ? 'Ersetzen' : 'PNG hochladen'}
          </label>
          <input id={inputId} type="file" accept=".png,image/png" style={{ display: 'none' }} onChange={(e) => void upload(e.target.files)} />
          {texture && (
            <button className="btn small ghost danger" onClick={() => onChange(undefined)}>
              <Trash2 size={14} /> Entfernen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="field-grid">{children}</div>;
}
