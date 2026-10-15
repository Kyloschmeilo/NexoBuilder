import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Badge } from './components/badge';

/** The visual state of something: drives the colour of dots and badges. */
export type Tone = 'neutral' | 'info' | 'busy' | 'success' | 'warning' | 'error';

const DOT: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-info',
  busy: 'bg-transparent ring-[1.5px] ring-primary ring-inset',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'rounded-[1px] bg-destructive',
};

/** A small status indicator: square for errors, round otherwise, hollow while busy. */
export function StatusDot({ tone, label, className }: { tone: Tone; /** Hover text */ label?: string; className?: string }) {
  return <span title={label} className={cn('size-2 shrink-0 rounded-full', DOT[tone], className)} />;
}

const BADGE = {
  neutral: 'secondary',
  info: 'info',
  busy: 'info',
  success: 'success',
  warning: 'warning',
  error: 'destructive',
} as const satisfies Record<Tone, string>;

/** A badge coloured by `tone`. */
export function StatusBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <Badge variant={BADGE[tone]} className={className}>
      {children}
    </Badge>
  );
}
