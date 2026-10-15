import type { ReactNode, RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@resourcepackbuilder/ui/components/dialog';
import { useStore } from '../../state/store';

const SIZES = {
  narrow: 'sm:max-w-[480px]',
  normal: 'sm:max-w-[720px]',
  wide: 'sm:max-w-[1040px]',
} as const;

interface AppDialogProps {
  title: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  size?: keyof typeof SIZES;
  /** Prevents closing by clicking outside (e.g. with unsaved input). Escape still closes. */
  sticky?: boolean;
  /** Muted text on the left of the footer (e.g. a summary). */
  footerStart?: ReactNode;
  /** Footer buttons, right-aligned. */
  footer?: ReactNode;
  /** Element focused when the dialog opens; defaults to the first focusable element. */
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

/**
 * Frame of every store-driven app dialog: a shadcn Dialog that is open while it is rendered and closes
 * through the store's `closeDialog` (Escape, outside click, close button).
 */
export function AppDialog({ title, icon, description, size = 'normal', sticky, footerStart, footer, initialFocus, className, children }: AppDialogProps) {
  const close = useStore((s) => s.closeDialog);
  return (
    <Dialog
      open
      disablePointerDismissal={sticky}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        initialFocus={initialFocus}
        className={cn('flex max-h-[calc(100vh-2.5rem)] flex-col gap-0 overflow-hidden p-0', SIZES[size], className)}
      >
        <DialogHeader className="px-6 pt-5 pr-12 pb-3">
          <DialogTitle className="flex items-center gap-3 font-heading text-xl leading-6 font-semibold tracking-wider text-primary uppercase [&_svg]:size-5 [&_svg]:shrink-0">
            {icon}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto px-6 pt-1 pb-6">{children}</div>
        {(footer || footerStart) && (
          <DialogFooter className="mx-0 mb-0 items-center px-6 py-4 sm:flex-row">
            {footerStart && <div className="mr-auto text-xs text-muted-foreground">{footerStart}</div>}
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Small uppercase caption above a dialog section. */
export function SectionLabel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('font-heading text-xs leading-4 font-semibold tracking-[0.14em] text-muted-foreground uppercase', className)}>{children}</div>;
}

/** Inline markup for `t.rich` messages used across the dialogs. */
export const richTags = {
  b: (chunks: ReactNode) => <b className="font-semibold text-foreground">{chunks}</b>,
  mono: (chunks: ReactNode) => <span className="font-mono">{chunks}</span>,
  code: (chunks: ReactNode) => <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">{chunks}</code>,
};

/**
 * Text of a human-readable string defined in core data. By convention it holds a key inside the `schema`
 * namespace; while a value is not (yet) such a key it is shown as is.
 */
export function useSchemaText(): (value: string) => string {
  const t = useTranslations('schema');
  return (value) => (t.has(value as never) ? t(value as never) : value);
}
