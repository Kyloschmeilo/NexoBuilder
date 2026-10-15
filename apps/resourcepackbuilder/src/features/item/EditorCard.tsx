import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';

interface EditorCardProps {
  title: ReactNode;
  /** Extra elements next to the title (badges). */
  badges?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Buttons on the right of the header; they wrap below the title when the editor is narrow. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A card of the item editor: icon, uppercase title, badges, description and actions above its content. */
export function EditorCard({ title, badges, description, icon, actions, children, className }: EditorCardProps) {
  return (
    <Card className={cn('gap-0 rounded-lg py-0', className)}>
      <CardHeader className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b py-3">
        {icon}
        <div className="min-w-0 flex-1 basis-40">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="min-w-0 truncate font-heading text-base font-semibold tracking-wider uppercase">{title}</CardTitle>
            {badges}
          </div>
          {description && <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-1">{actions}</div>}
      </CardHeader>
      <CardContent className="py-5">{children}</CardContent>
    </Card>
  );
}
