/**
 * Joined buttons of which exactly one is active: the control for a choice of up to four options (Nothing / Block /
 * Furniture, Normal / Destroy / Block).
 */
import type { ReactNode } from 'react';
import { cn } from 'cn';
import { ToggleGroup, ToggleGroupItem } from '../components/toggle-group';
import { Tip } from '../Tip';

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
  /** `default` is a 30 px control, `sm` a 26 px one. */
  size?: 'sm' | 'default';
  'aria-label'?: string;
  className?: string;
}

/**
 * One hairline frame on the canvas colour; the active segment is filled with the soft accent and set in the accent
 * colour (radio behaviour on a toggle group).
 */
export function SegmentedControl<T extends string>({ value, options, onChange, size, className, ...props }: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      size={size}
      spacing={0}
      aria-label={props['aria-label']}
      className={cn('h-7.5 max-w-full overflow-hidden rounded-md border border-line bg-canvas data-[size=sm]:h-6.5', className)}
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
              'h-full rounded-none! px-3 text-label text-text-muted hover:bg-muted hover:text-text focus-visible:ring-inset',
              'data-pressed:bg-accent data-pressed:font-semibold data-pressed:text-primary',
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
