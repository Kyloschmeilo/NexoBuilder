import { cn } from 'cn';
import { Tip } from './Tip';
import type { Tone } from './tone';

const DOT_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-info',
  busy: 'bg-transparent ring-[1.5px] ring-primary ring-inset',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'rounded-[1px] bg-destructive',
};

/** A small status indicator: square for errors, round otherwise, hollow while busy. */
export function StatusDot({ tone, label, className }: { tone: Tone; /** Tooltip text */ label?: string; className?: string }) {
  return (
    <Tip label={label}>
      <span className={cn('size-2 shrink-0 rounded-full', DOT_CLASS[tone], className)} />
    </Tip>
  );
}
