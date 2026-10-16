import { Plus } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';

export interface AddMenuOption<T> {
  value: T;
  label: string;
  description?: string;
}

interface AddMenuButtonProps<T> {
  /** Button text, e.g. "Add". */
  label: string;
  options: ReadonlyArray<AddMenuOption<T>>;
  onSelect: (value: T) => void;
  /** Width of the menu, e.g. `w-90`. */
  menuClassName?: string;
}

/** "Add" button that opens a menu of what can be added, each entry with a description; disabled when nothing is left. */
export function AddMenuButton<T>({ label, options, onSelect, menuClassName }: AddMenuButtonProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" disabled={options.length === 0} />}>
        <Plus /> {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn('w-90 max-w-[calc(100vw-2rem)]', menuClassName)}>
        {options.map((option, i) => (
          <DropdownMenuItem key={i} className="flex-col items-start gap-0.5" onClick={() => onSelect(option.value)}>
            <span className="font-medium">{option.label}</span>
            {option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
