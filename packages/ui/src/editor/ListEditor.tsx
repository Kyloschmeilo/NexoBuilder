/**
 * The one list pattern of the editors: 36 px rows with a drag handle, a one-line summary and actions on hover
 * (duplicate, move, remove). A row expands in place to its editor, or opens it in a dialog. Rows keep stable React keys
 * across moves and removals, so focus and input state stay with their row.
 */
import { useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ArrowDown, ArrowUp, ChevronRight, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/dialog';
import { IconButton } from '../IconButton';
import { useUiLabels } from '../labels';
import { useRowKeys } from '../useRowKeys';
import { EmptyHint } from './EmptyHint';
import { insertItem, moveItem, removeItem, replaceItem } from './listOps';
import { Panel } from './Panel';

export interface ListEditorProps<T> {
  items: readonly T[];
  /** Receives the whole new list after a move, duplicate, removal or edit of a row. */
  onChange: (items: T[]) => void;
  /** The one-line content of a collapsed row. */
  renderSummary: (item: T, index: number) => ReactNode;
  /** The editor of a row; without one rows do not expand. */
  renderEditor?: (item: T, onChange: (item: T) => void, index: number) => ReactNode;
  /** Expands the editor below the row (default) or opens it in a dialog (for deep nesting). */
  editIn?: 'inline' | 'dialog';
  /** Title of the editor dialog; the summary by default. */
  dialogTitle?: (item: T, index: number) => ReactNode;
  /**
   * Adds an entry: append one through the parent's state, or open a picker that does. An entry appended right after
   * the click opens its editor.
   */
  onAdd?: () => void;
  /** Caption of the add button, e.g. "Add behavior". */
  addLabel?: string;
  /** Shown instead of the rows while the list is empty, e.g. "No behaviors yet." */
  emptyText?: ReactNode;
  /** Shows the drag handle and the move buttons; on by default. */
  reorderable?: boolean;
  /**
   * The copy a duplicate inserts below the row; `false` hides the button. The default is `structuredClone`, or no
   * duplicate button when `getKey` is given (a clone would repeat the key, so pass a copy with a new identity).
   */
  duplicate?: false | ((item: T) => T);
  /** Hides the remove button. */
  required?: boolean;
  /** React key of an entry with an identity of its own; rows get generated keys without it. */
  getKey?: (item: T, index: number) => string;
  /** Accessible name of the list. */
  'aria-label'?: string;
  className?: string;
}

/** Where a dragged row is dropped. */
interface DragState {
  from: number;
  over: number | null;
}

/** An editable list of rows. */
export function ListEditor<T>({
  items,
  onChange,
  renderSummary,
  renderEditor,
  editIn = 'inline',
  dialogTitle,
  onAdd,
  addLabel,
  emptyText,
  reorderable = true,
  duplicate,
  required,
  getKey,
  className,
  ...props
}: ListEditorProps<T>) {
  const labels = useUiLabels();
  const rows = useRowKeys(items.length);
  const keys = getKey ? items.map(getKey) : rows.keys;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [dialogKey, setDialogKey] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [prevCount, setPrevCount] = useState(items.length);
  const [list, setList] = useState<HTMLUListElement | null>(null);

  if (prevCount !== items.length) {
    // An entry appended right after a click on "Add" opens its editor (adjusting state while rendering)
    setPrevCount(items.length);
    if (isAdding) {
      setIsAdding(false);
      const added = keys[items.length - 1];
      if (items.length > prevCount && added && renderEditor) {
        if (editIn === 'dialog') setDialogKey(added);
        else setExpanded((prev) => new Set(prev).add(added));
      }
    }
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    if (!getKey) rows.move(from, to);
    onChange(moveItem(items, from, to));
  };
  /** Removes a row and moves the focus to the row that takes its place (or the one above), so it is not lost. */
  const remove = (index: number) => {
    const neighbour = keys[index + 1] ?? keys[index - 1];
    flushSync(() => {
      if (!getKey) rows.remove(index);
      onChange(removeItem(items, index));
    });
    if (neighbour) list?.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(neighbour)}"] button`)?.focus();
  };
  // A clone would repeat the identity `getKey` reads, so lists with their own keys must pass a `duplicate` of their own
  const copyOf = duplicate === undefined ? (getKey ? false : (item: T) => structuredClone(item)) : duplicate;
  const copy = (index: number) => {
    if (!copyOf) return;
    if (!getKey) rows.insert(index + 1);
    onChange(insertItem(items, index + 1, copyOf(items[index])));
  };
  const edit = (index: number, item: T) => onChange(replaceItem(items, index, item));
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  /** Moves a row by keyboard and keeps the focus on its handle once the list has re-rendered. */
  const moveByKey = (index: number, delta: number) => {
    const key = keys[index];
    flushSync(() => move(index, index + delta));
    list?.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(key)}"] [data-slot=drag-handle]`)?.focus();
  };

  const dialogIndex = dialogKey === null ? -1 : keys.indexOf(dialogKey);
  const addButton = onAdd && addLabel && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="self-start text-primary hover:text-primary"
      onClick={() => {
        setIsAdding(true);
        onAdd();
      }}
    >
      <Plus /> {addLabel}
    </Button>
  );

  if (items.length === 0) {
    return (
      <EmptyHint
        className={className}
        actionLabel={addLabel}
        onAction={
          onAdd &&
          (() => {
            setIsAdding(true);
            onAdd();
          })
        }
      >
        {emptyText}
      </EmptyHint>
    );
  }

  return (
    <div data-slot="list-editor" className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Panel>
        <ul ref={setList} aria-label={props['aria-label']} className="m-0 list-none divide-y divide-line p-0">
          {items.map((item, index) => {
            const key = keys[index];
            const isExpanded = editIn === 'inline' && expanded.has(key);
            const isDropTarget = drag !== null && drag.over === index && drag.from !== index;
            return (
              <li
                key={key}
                data-row-key={key}
                data-slot="list-row"
                className={cn(
                  'group/row relative min-w-0',
                  isDropTarget && (drag.from < index ? 'shadow-[inset_0_-2px_0_var(--accent)]' : 'shadow-[inset_0_2px_0_var(--accent)]'),
                  drag?.from === index && 'opacity-50',
                )}
                onDragOver={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (drag.over !== index) setDrag({ ...drag, over: index });
                }}
                onDrop={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  move(drag.from, index);
                  setDrag(null);
                }}
              >
                <div className="flex h-9 min-w-0 items-center gap-1 pr-1.5 pl-1">
                  {reorderable && (
                    <button
                      type="button"
                      data-slot="drag-handle"
                      draggable
                      aria-label={labels.dragToReorder}
                      aria-keyshortcuts="ArrowUp ArrowDown"
                      className="grid h-7 w-5 flex-none cursor-grab place-items-center rounded-md text-text-faint outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(index));
                        const row = e.currentTarget.closest('li');
                        if (row) e.dataTransfer.setDragImage(row, 16, 18);
                        setDrag({ from: index, over: null });
                      }}
                      onDragEnd={() => setDrag(null)}
                      onKeyDown={(e) => {
                        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                        e.preventDefault();
                        moveByKey(index, e.key === 'ArrowUp' ? -1 : 1);
                      }}
                    >
                      <GripVertical className="size-3.5" aria-hidden />
                    </button>
                  )}
                  {renderEditor ? (
                    <button
                      type="button"
                      aria-expanded={editIn === 'inline' ? isExpanded : undefined}
                      aria-haspopup={editIn === 'dialog' ? 'dialog' : undefined}
                      className="flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-1 text-left text-label text-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => (editIn === 'dialog' ? setDialogKey(key) : toggle(key))}
                    >
                      <ChevronRight
                        aria-hidden
                        className={cn('size-3.5 flex-none text-text-muted transition-transform', isExpanded && 'rotate-90')}
                      />
                      <span className="min-w-0 flex-1 truncate">{renderSummary(item, index)}</span>
                    </button>
                  ) : (
                    <div className="min-w-0 flex-1 truncate px-1 text-label text-text">{renderSummary(item, index)}</div>
                  )}
                  <div className="flex flex-none items-center opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
                    {copyOf && (
                      <IconButton label={labels.duplicate} size="icon-xs" onClick={() => copy(index)}>
                        <Copy />
                      </IconButton>
                    )}
                    {reorderable && (
                      <>
                        <IconButton label={labels.moveUp} size="icon-xs" disabled={index === 0} onClick={() => move(index, index - 1)}>
                          <ArrowUp />
                        </IconButton>
                        <IconButton
                          label={labels.moveDown}
                          size="icon-xs"
                          disabled={index === items.length - 1}
                          onClick={() => move(index, index + 1)}
                        >
                          <ArrowDown />
                        </IconButton>
                      </>
                    )}
                    {!required && (
                      <IconButton label={labels.remove} size="icon-xs" variant="ghost-destructive" onClick={() => remove(index)}>
                        <Trash2 />
                      </IconButton>
                    )}
                  </div>
                </div>
                {isExpanded && renderEditor && (
                  <div data-slot="list-row-editor" className={cn('min-w-0 pt-1 pr-3 pb-3', reorderable ? 'pl-11' : 'pl-6')}>
                    {renderEditor(item, (next) => edit(index, next), index)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
      {addButton}
      {editIn === 'dialog' && renderEditor && (
        <Dialog open={dialogIndex >= 0} onOpenChange={(open) => !open && setDialogKey(null)}>
          {dialogIndex >= 0 && (
            <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-sans text-title tracking-normal text-text normal-case">
                  {(dialogTitle ?? renderSummary)(items[dialogIndex], dialogIndex)}
                </DialogTitle>
              </DialogHeader>
              {renderEditor(items[dialogIndex], (next) => edit(dialogIndex, next), dialogIndex)}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{labels.done}</DialogClose>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      )}
    </div>
  );
}
