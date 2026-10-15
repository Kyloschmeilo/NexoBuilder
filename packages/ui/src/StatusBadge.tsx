import type { ComponentProps } from 'react';
import { Badge } from './components/badge';
import type { Tone } from './tone';

const BADGE_VARIANT = {
  neutral: 'secondary',
  info: 'info',
  busy: 'info',
  success: 'success',
  warning: 'warning',
  error: 'destructive',
} as const satisfies Record<Tone, string>;

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, 'variant'> & { tone: Tone };

/** A badge coloured by `tone`; other props (data attributes, aria) go to the badge. */
export function StatusBadge({ tone, ...props }: StatusBadgeProps) {
  return <Badge variant={BADGE_VARIANT[tone]} {...props} />;
}
