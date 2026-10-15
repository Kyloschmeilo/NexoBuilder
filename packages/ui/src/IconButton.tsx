import type { ComponentProps, ReactNode } from 'react';
import { cn } from 'cn';
import { Button } from './components/button';
import { Tip } from './Tip';

interface IconButtonProps extends Omit<ComponentProps<typeof Button>, 'children' | 'aria-label'> {
  /** Accessible name and tooltip. */
  label: string;
  /** `destructive` stays muted until hovered, for remove/delete actions in lists. */
  tone?: 'default' | 'destructive';
  side?: ComponentProps<typeof Tip>['side'];
  /** The icon. */
  children: ReactNode;
}

/** Icon-only button with its label as tooltip; ghost and small unless `variant`/`size` say otherwise. */
export function IconButton({
  label,
  tone = 'default',
  side,
  variant = 'ghost',
  size = 'icon-sm',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Tip label={label} side={side}>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-label={label}
        className={cn(tone === 'destructive' && 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive', className)}
        {...props}
      >
        {children}
      </Button>
    </Tip>
  );
}
