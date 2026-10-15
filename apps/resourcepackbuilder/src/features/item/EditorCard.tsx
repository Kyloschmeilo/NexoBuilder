import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';

interface EditorCardProps {
  title?: ReactNode;
  /** Extra elements next to the title (badges). */
  badges?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Buttons on the right of the header. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** A card with the editor's header look: icon, uppercase title, description and actions, separated by a border. */
export function EditorCard({ title, badges, description, icon, actions, children, className, contentClassName }: EditorCardProps) {
  const hasHeader = title !== undefined || description !== undefined || actions !== undefined;
  return (
    <Card className={cn('mb-4 gap-0 rounded-lg py-0', className)}>
      {hasHeader && (
        <CardHeader className="flex items-center gap-3 border-b py-3">
          {icon}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {title !== undefined && (
                <CardTitle className="truncate font-heading text-base font-semibold tracking-wider uppercase">{title}</CardTitle>
              )}
              {badges}
            </div>
            {description !== undefined && <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </CardHeader>
      )}
      {children !== undefined && <CardContent className={cn('py-5', contentClassName)}>{children}</CardContent>}
    </Card>
  );
}

/** Placeholder card shown when a list is empty. */
export function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <Card className="mb-4 rounded-lg py-0">
      <CardContent className="px-4 py-5 text-center text-xs text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
