/** A small outlined pill that states a status (valid, 2 warnings, 1 error) in the status colours, never the accent. */
import type { ReactNode } from 'react';
import { cn } from 'cn';

/** The status a {@link StatusPill} reports. `info` and `muted` are neutral. */
export type StatusPillTone = 'ok' | 'warning' | 'error' | 'info' | 'muted';

const TONE_CLASS: Record<StatusPillTone, string> = {
  ok: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
  info: 'text-text-muted',
  muted: 'text-text-faint',
};

interface StatusPillProps {
  tone: StatusPillTone;
  /** Shown before the label in tabular figures ("2 warnings"). */
  count?: number;
  label: ReactNode;
  /** A dot in the tone's colour before the text. */
  dot?: boolean;
  className?: string;
}

/** An outlined, rounded pill in the colour of `tone`. */
export function StatusPill({ tone, count, label, dot, className }: StatusPillProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex h-5 items-center gap-1.5 rounded-4xl border border-current px-2 text-micro font-semibold whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {count !== undefined && <span className="tabular-nums">{count}</span>}
      {label}
    </span>
  );
}
