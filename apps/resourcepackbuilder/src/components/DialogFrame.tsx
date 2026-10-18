import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '@resourcepackbuilder/ui/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogHandle,
} from '@resourcepackbuilder/ui/components/dialog';
import { registerFeatureDialog } from '../store/dialogs';
import { useProjectStore } from '../store/project';

const SIZES = {
  narrow: 'sm:max-w-120',
  normal: 'sm:max-w-180',
  wide: 'sm:max-w-260',
} as const;

/** Lets the frame of an open feature dialog make it sticky (no closing by clicking outside). */
const StickyContext = createContext<RefObject<boolean> | null>(null);

interface FeatureDialogProps<P> {
  handle: DialogHandle<P>;
  /** Whether the dialog belongs to the open project: it then needs one, and closes when it is closed or replaced. */
  isProjectBound?: boolean;
  /** The dialog's frame for one opening; rendered afresh (new state) every time the dialog opens. */
  children: (payload: P) => ReactNode;
}

/**
 * Root of a feature dialog: rendered once by the shell, opened through `handle` (`handle.open(null)` or
 * `handle.openWithPayload(payload)`). Its content is mounted from opening until the closing animation ended.
 */
export function FeatureDialog<P>({ handle, isProjectBound = true, children }: FeatureDialogProps<P>) {
  const projectId = useProjectStore((s) => s.project?.id ?? null);
  /** The current opening: a counter that remounts the content, and the project it was opened for */
  const [opening, setOpening] = useState<{ count: number; projectId: string | null } | null>(null);
  const sticky = useRef(false);

  useEffect(() => registerFeatureDialog(handle as DialogHandle<never>, isProjectBound), [handle, isProjectBound]);

  const isShown = opening !== null && (!isProjectBound || opening.projectId === projectId);
  return (
    <Dialog
      handle={handle}
      onOpenChange={(open, details) => {
        if (open && isProjectBound && !projectId) details.cancel();
        else if (open) {
          sticky.current = false;
          setOpening((current) => ({ count: (current?.count ?? 0) + 1, projectId }));
        } else if (sticky.current && details.reason === 'outside-press') details.cancel();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setOpening(null);
      }}
    >
      {({ payload }) =>
        isShown && (
          <StickyContext.Provider key={opening.count} value={sticky}>
            {children(payload as P)}
          </StickyContext.Provider>
        )
      }
    </Dialog>
  );
}

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
  className?: string;
  children: ReactNode;
}

/**
 * Frame of every app dialog: the popup of the surrounding dialog root ({@link FeatureDialog} or a controlled
 * `Dialog`). Its body is a size container (`@container/dialog`), so content adapts to the dialog's width rather than
 * the window's.
 */
export function DialogFrame({
  title,
  icon,
  description,
  size = 'normal',
  sticky = false,
  footerStart,
  footer,
  initialFocus,
  className,
  children,
}: DialogFrameProps) {
  const stickyRef = useContext(StickyContext);
  useEffect(() => {
    if (stickyRef) stickyRef.current = sticky;
  }, [stickyRef, sticky]);

  return (
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
  );
}
