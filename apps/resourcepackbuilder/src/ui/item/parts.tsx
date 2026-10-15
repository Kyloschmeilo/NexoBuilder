/**
 * Small layout building blocks shared by the item editor tabs (section titles, cards, hints, texture thumbnails).
 */
import type { ReactElement, ReactNode } from 'react';
import { cn } from 'cn';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@resourcepackbuilder/ui/components/tooltip';

/** Small uppercase heading above a group of cards, optionally with actions on the right. */
export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-2 font-heading text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase first:mt-0">
      <span>{children}</span>
      <span className="flex-1" />
      {actions && <span className="flex items-center gap-2 font-sans tracking-normal normal-case">{actions}</span>}
    </div>
  );
}

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

/** Info / warning box inside a card. */
export function Hint({ warning, children, action }: { warning?: boolean; children: ReactNode; action?: ReactNode }) {
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

/** Wraps a trigger element (usually a Button) with a tooltip. */
export function Tip({ label, children }: { label: ReactNode; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Square thumbnail on a checkerboard (for transparent pixels). */
export function TextureThumb({ size = 64, children, className }: { size?: number; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-sm bg-background bg-[conic-gradient(var(--muted)_25%,transparent_0_50%,var(--muted)_0_75%,transparent_0)] bg-size-[12px_12px] text-muted-foreground [&_img]:max-h-full [&_img]:max-w-full [&_img]:[image-rendering:pixelated]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
