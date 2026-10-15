import type { ComponentProps, ReactNode } from 'react';
import { Button } from './components/button';
import { Tip } from './Tip';

interface IconButtonProps extends Omit<ComponentProps<typeof Button>, 'children'> {
  /** Tooltip, and the accessible name when it is a string (otherwise pass `aria-label`). */
  label: ReactNode;
  side?: ComponentProps<typeof Tip>['side'];
  /** The icon. */
  children: ReactNode;
}

/**
 * Icon-only button with its label as tooltip; ghost and small unless `variant`/`size` say otherwise.
 * Remove/delete actions in lists use `variant="ghost-destructive"`, which stays muted until hovered.
 */
export function IconButton({ label, side, variant = 'ghost', size = 'icon-sm', children, ...props }: IconButtonProps) {
  return (
    <Tip label={label} side={side}>
      <Button type="button" variant={variant} size={size} aria-label={typeof label === 'string' ? label : undefined} {...props}>
        {children}
      </Button>
    </Tip>
  );
}
