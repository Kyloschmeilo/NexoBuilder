import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';

/** Info / warning box inside a card. */
export function EditorHint({ warning, children, action }: { warning?: boolean; children: ReactNode; action?: ReactNode }) {
  return (
    <Alert
      className={cn(
        'mb-3 flex items-center gap-2 rounded-md px-3 py-2.5',
        warning ? 'border-warning bg-transparent text-foreground' : 'bg-muted text-muted-foreground',
      )}
    >
      <AlertDescription className="min-w-0 flex-1 text-[13px] leading-5 text-inherit">{children}</AlertDescription>
      {action}
    </Alert>
  );
}
