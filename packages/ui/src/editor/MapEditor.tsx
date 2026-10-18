/**
 * A string-keyed map as a two-column table: mono keys that rename on blur, a value editor per entry, and an add row at
 * the bottom. Keys keep their order; a rename keeps the entry in place and keeps focus where the user moved it.
 */
import { useId, useState, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { IconButton } from '../IconButton';
import { useUiLabels } from '../labels';
import { useDraft } from '../useDraft';
import { mapKeyProblem, removeMapKey, renameMapKey, setMapValue } from './listOps';
import { Panel } from './Panel';

export interface MapEditorProps<V> {
  /** The map; entries whose key is in `reservedKeys` are not shown. */
  entries: Readonly<Record<string, V>>;
  /** Receives the whole new map after an add, rename, removal or value edit. */
  onChange: (entries: Record<string, V>) => void;
  /** The editor of one value. */
  renderValue: (value: V, onChange: (value: V) => void, key: string) => ReactNode;
  /** The value a new entry starts with. */
  newValue: () => V;
  /** Header of the key column; "Key" by default. */
  keyLabel?: string;
  /** Header of the value column; "Value" by default. */
  valueLabel?: string;
  /** Placeholder of the new-key input; the key label by default. */
  keyPlaceholder?: string;
  /** Keys offered while typing a new key (keys already in the map are left out). */
  keySuggestions?: readonly string[];
  /** Keys that belong to other fields of the same object: hidden here and not allowed as new keys. */
  reservedKeys?: readonly string[];
  /** Caption of the add button; "Add entry" by default. */
  addLabel?: string;
  /** Puts each value below its key instead of beside it (for values that need the width: objects, lists). */
  stacked?: boolean;
  className?: string;
}

/** The key of an entry; the rename is applied when the input loses focus (or on Enter). */
function KeyCell({ value, label, onRename }: { value: string; label: string; onRename: (key: string) => boolean }) {
  const { draft, setDraft, reset } = useDraft(
    value,
    (text) => ({ value: text.trim() }),
    (key) => key,
  );
  return (
    <Input
      aria-label={label}
      className="h-7.5 font-mono text-meta"
      value={draft}
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const key = draft.trim();
        // A rejected rename (empty or taken) shows the old key again
        if (key === value || !onRename(key)) reset();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') reset();
      }}
    />
  );
}

/** A key/value table with an add row. */
export function MapEditor<V>({
  entries,
  onChange,
  renderValue,
  newValue,
  keyLabel,
  valueLabel,
  keyPlaceholder,
  keySuggestions,
  reservedKeys = [],
  addLabel,
  stacked,
  className,
}: MapEditorProps<V>) {
  const labels = useUiLabels();
  const listId = useId();
  const [newKey, setNewKey] = useState('');
  const keyHeader = keyLabel ?? labels.key;
  const shown = Object.entries(entries).filter(([key]) => !reservedKeys.includes(key));
  // Rows are keyed by an id of their own, not by the map key: a rename on blur must not remount the row, or the value
  // input the user tabs or clicks into loses focus. A rename hands the id on to the new key.
  const [rowIds, setRowIds] = useState<Readonly<Record<string, string>>>({});
  let ids = rowIds;
  const missing = shown.filter(([key]) => !Object.hasOwn(rowIds, key));
  if (missing.length > 0) {
    // Adjusting state while rendering: entries added from outside (paste, undo) get their ids in the same frame
    ids = { ...rowIds, ...Object.fromEntries(missing.map(([key]) => [key, crypto.randomUUID()])) };
    setRowIds(ids);
  }
  const problem = newKey.trim() ? mapKeyProblem(entries, newKey, reservedKeys) : null;
  const suggestions = keySuggestions?.filter((key) => !Object.hasOwn(entries, key) && !reservedKeys.includes(key));

  const add = () => {
    if (mapKeyProblem(entries, newKey, reservedKeys)) return;
    onChange(setMapValue(entries, newKey.trim(), newValue()));
    setNewKey('');
  };
  const rename = (oldKey: string, key: string): boolean => {
    if (mapKeyProblem(entries, key, reservedKeys, oldKey)) return false;
    onChange(renameMapKey(entries, oldKey, key));
    setRowIds((prev) => {
      const { [oldKey]: id, ...rest } = prev;
      return id === undefined ? rest : { ...rest, [key]: id };
    });
    return true;
  };
  const grid = stacked ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-[minmax(7rem,2fr)_minmax(0,3fr)_auto]';

  return (
    <div data-slot="map-editor" className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {shown.length > 0 && (
        <Panel role="table" aria-label={keyHeader}>
          <div role="row" className={cn('grid items-center gap-x-2 border-b border-line px-2 py-1 text-meta text-text-muted', grid)}>
            <span role="columnheader">{keyHeader}</span>
            {!stacked && <span role="columnheader">{valueLabel ?? labels.value}</span>}
            <span className="w-6" />
          </div>
          <div className="divide-y divide-line">
            {shown.map(([key, value]) => (
              <div key={ids[key]} role="row" data-slot="map-row" className={cn('grid items-start gap-x-2 gap-y-1.5 px-2 py-1.5', grid)}>
                <div role="cell" className="min-w-0">
                  <KeyCell value={key} label={keyHeader} onRename={(next) => rename(key, next)} />
                </div>
                <div role="cell" className={cn('min-w-0', stacked && 'col-span-full row-start-2')}>
                  {renderValue(value, (next) => onChange(setMapValue(entries, key, next)), key)}
                </div>
                <div role="cell" className={cn(stacked && 'col-start-2 row-start-1')}>
                  <IconButton label={labels.remove} variant="ghost-destructive" onClick={() => onChange(removeMapKey(entries, key))}>
                    <Trash2 />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        <Input
          aria-label={keyHeader}
          aria-invalid={problem === 'taken' || undefined}
          className="h-7.5 min-w-0 flex-[1_1_12rem] font-mono text-meta"
          placeholder={keyPlaceholder ?? keyHeader}
          value={newKey}
          list={suggestions?.length ? listId : undefined}
          spellCheck={false}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
        />
        <Button
          type="button"
          variant="ghost"
          className="text-primary hover:text-primary"
          disabled={problem !== null || !newKey.trim()}
          onClick={add}
        >
          <Plus /> {addLabel ?? labels.addEntry}
        </Button>
      </div>
      {problem === 'taken' && <p className="m-0 text-meta text-danger">{labels.keyTaken}</p>}
      {suggestions && suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((key) => (
            <option key={key} value={key} />
          ))}
        </datalist>
      )}
    </div>
  );
}
