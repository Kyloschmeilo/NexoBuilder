import type { ReactNode, RefObject } from 'react';
import { cn } from 'cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@resourcepackbuilder/ui/components/dialog';
import { closeDialog } from '../store/dialogs';

const SIZES = {
  narrow: 'sm:max-w-120',
  normal: 'sm:max-w-180',
  wide: 'sm:max-w-260',
} as const;

interface DialogFrameProps {
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
  /** Called on Escape, outside click and the close button; closes the open feature dialog by default. */
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Frame of every app dialog: a shadcn Dialog that is open while it is rendered. Its body is a size container
 * (`@container/dialog`), so content adapts to the dialog's width rather than the window's.
 */
export function DialogFrame({
  title,
  icon,
  description,
  size = 'normal',
  sticky,
  footerStart,
  footer,
  initialFocus,
  onClose = closeDialog,
  className,
  children,
}: DialogFrameProps) {
  return (
    <Dialog
      open
      disablePointerDismissal={sticky}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        initialFocus={initialFocus}
        className={cn('flex max-h-[calc(100vh-2.5rem)] flex-col gap-0 overflow-hidden p-0', SIZES[size], className)}
      >
        <DialogHeader className="px-6 pt-5 pr-12 pb-3">
          <DialogTitle>
            {icon}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="@container/dialog min-h-0 flex-1 overflow-auto px-6 pt-1 pb-6">{children}</div>
        {(footer || footerStart) && (
          <DialogFooter className="mx-0 mb-0 items-center px-6 py-4 sm:flex-row">
            {footerStart && <div className="mr-auto min-w-0 text-xs text-muted-foreground">{footerStart}</div>}
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
