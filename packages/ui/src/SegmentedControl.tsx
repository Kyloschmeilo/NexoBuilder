import type { ReactNode } from 'react';
import { cn } from 'cn';
import { ToggleGroup, ToggleGroupItem } from './components/toggle-group';
import { Tip } from './Tip';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Tooltip of the segment. */
  hint?: string;
  className?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
  size?: 'sm' | 'default';
  'aria-label'?: string;
  className?: string;
}

/** Joined buttons of which exactly one is active (radio behaviour on a toggle group). */
export function SegmentedControl<T extends string>({ value, options, onChange, size, className, ...props }: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      variant="outline"
      size={size}
      spacing={0}
      aria-label={props['aria-label']}
      className={cn('bg-background', className)}
      value={[value]}
      onValueChange={(next: string[]) => {
        // Clicking the active segment would empty the group; the selection stays instead
        const picked = options.find((option) => option.value !== value && next.includes(option.value));
        if (picked) onChange(picked.value);
      }}
    >
      {options.map((option) => (
        <Tip key={option.value} label={option.hint}>
          <ToggleGroupItem
            value={option.value}
            className={cn(
              'px-3 text-muted-foreground hover:text-foreground data-pressed:bg-accent data-pressed:font-semibold data-pressed:text-primary',
              option.className,
            )}
          >
            {option.label}
          </ToggleGroupItem>
        </Tip>
      ))}
    </ToggleGroup>
  );
}
