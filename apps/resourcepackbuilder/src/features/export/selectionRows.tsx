/** Rows shared by the export selection lists: a checkbox beside a button that opens and closes the row's children. */
import type { CSSProperties, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from 'cn';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';

export type CheckState = 'all' | 'none' | 'some';

export const ROW = 'flex min-h-8 items-center gap-2 rounded-sm pr-3 text-sm text-foreground select-none hover:bg-muted';
export const LABEL = 'min-w-0 flex-1 truncate';
export const COUNT = 'font-mono text-xs whitespace-nowrap text-muted-foreground';
export const ICON = 'size-4 shrink-0 text-muted-foreground';

/** Indentation per level of the selection tree, in pixels. */
export const INDENT_PX = 16;

export function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <span className="grid w-3.5 shrink-0 place-items-center text-muted-foreground">
      {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
    </span>
  );
}

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
    <div className={cn(ROW, className)} style={style}>
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
        <Chevron isOpen={isOpen} />
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
    <label className={cn(ROW, 'cursor-pointer')} style={style}>
      <Checkbox checked={isChecked} onCheckedChange={onCheckedChange} />
      {children}
    </label>
  );
}
