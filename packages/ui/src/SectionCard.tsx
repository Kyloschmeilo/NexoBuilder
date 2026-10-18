import type { ComponentProps, ReactNode } from 'react';
import { cn } from './lib/cn';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from './components/card';

interface SectionCardProps extends Pick<ComponentProps<typeof Card>, 'size' | 'variant'> {
  title: ReactNode;
  /** Shown before the title. */
  icon?: ReactNode;
  /** Extra elements next to the title (badges). */
  badges?: ReactNode;
  description?: ReactNode;
  /** Buttons on the right of the header. */
  actions?: ReactNode;
  /** Without children the card is only its header. */
  children?: ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
}

/**
 * A panel (surface colour, hairline border, panel radius) with a header row (icon, title, badges, description, actions)
 * separated from its content by a hairline.
 */
export function SectionCard({
  title,
  icon,
  badges,
  description,
  actions,
  size,
  variant,
  children,
  className,
  titleClassName,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card size={size} variant={variant} className={cn('gap-0 py-0', className)}>
      <CardHeader className={cn('py-2.5', children !== undefined && 'border-b border-line [.border-b]:pb-2.5')}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          {icon}
          <CardTitle className={cn('min-w-0 text-title font-semibold break-words text-text', titleClassName)}>{title}</CardTitle>
          {badges}
        </div>
        {description && <CardDescription className="text-meta">{description}</CardDescription>}
        {actions && <CardAction className="flex flex-wrap items-center justify-end gap-1.5">{actions}</CardAction>}
      </CardHeader>
      {children !== undefined && (
        <CardContent className={cn('py-4 group-data-[size=sm]/card:py-3', contentClassName)}>{children}</CardContent>
      )}
    </Card>
  );
}
