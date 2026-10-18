import type { ReactNode } from 'react';
import { cn } from '@resourcepackbuilder/ui/cn';

/**
 * Dark, Minecraft-tooltip-like box for MiniMessage lines. It always uses the dark theme tokens (scoped
 * `dark` class) because Minecraft text colours are designed for a dark background.
 */
export function MiniMessageBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'dark inline-block max-w-full min-w-40 rounded-sm border-2 border-input bg-background px-2.5 py-1.5 font-sans text-sm leading-5 text-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}
