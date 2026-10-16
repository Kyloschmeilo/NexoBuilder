/** Rows shared by the export selection lists: a checkbox beside a button that opens and closes the row's children. */
import type { CSSProperties, ReactNode } from 'react';
import { TreeChevron, treeRow } from '@resourcepackbuilder/ui';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';

type CheckState = 'all' | 'none' | 'some';

interface GroupRowProps {
  /** Accessible name of the checkbox */
  label: string;
  state: CheckState;
  onCheckedChange: (checked: boolean) => void;
  isOpen: boolean;
  onToggle: () => void;
  style?: CSSProperties;
  className?: string;
  /** Content of the toggle button after the chevron */
  children: ReactNode;
}

/** A row that groups others (folder, list, project): checkbox for the whole group and a toggle for its children. */
export function GroupRow({ label, state, onCheckedChange, isOpen, onToggle, style, className, children }: GroupRowProps) {
  return (
    <div className={treeRow({ surface: 'panel', className })} style={style}>
      <Checkbox
        aria-label={label}
        checked={state === 'all'}
        indeterminate={state === 'some'}
        onCheckedChange={() => onCheckedChange(state !== 'all')}
      />
      <button
        type="button"
        aria-expanded={isOpen}
        className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 text-left outline-none focus-visible:underline"
        onClick={onToggle}
      >
        <TreeChevron isOpen={isOpen} />
        {children}
      </button>
    </div>
  );
}

/** A single checkable entry (item, glyph, sound, painting). */
export function EntryRow({
  isChecked,
  onCheckedChange,
  style,
  children,
}: {
  isChecked: boolean;
  onCheckedChange: (checked: boolean) => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <label className={treeRow({ surface: 'panel', className: 'cursor-pointer' })} style={style}>
      <Checkbox checked={isChecked} onCheckedChange={onCheckedChange} />
      {children}
    </label>
  );
}
