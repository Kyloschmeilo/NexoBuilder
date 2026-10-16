import type { ComponentProps } from 'react';
import { Badge } from './components/badge';
import { Spinner } from './components/spinner';
import { TONE_BADGE_VARIANT, type Tone } from './tone';

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, 'variant'> & { tone: Tone };

/** A badge coloured by `tone`, with a spinner while `busy`; other props (data attributes, aria) go to the badge. */
export function StatusBadge({ tone, children, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={TONE_BADGE_VARIANT[tone]} {...props}>
      {tone === 'busy' && <Spinner />}
      {children}
    </Badge>
  );
}
