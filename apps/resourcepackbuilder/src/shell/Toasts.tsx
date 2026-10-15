/** Shows the queued notices as toasts; the toasts own their lifetime (auto-dismiss, close button). */
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleCheck, Info, OctagonX, TriangleAlert } from 'lucide-react';
import { cn } from 'cn';
import {
  Toast,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastViewport,
  createToastManager,
  useToastManager,
} from '@resourcepackbuilder/ui/components/toast';
import { takeToasts, useNotificationStore, type ToastKind } from '../store/notifications';

const TOAST_STYLES: Record<ToastKind, { icon: typeof Info; className: string; border: string }> = {
  info: { icon: Info, className: 'text-info', border: 'border-border' },
  success: { icon: CircleCheck, className: 'text-success', border: 'border-success/60' },
  warning: { icon: TriangleAlert, className: 'text-warning', border: 'border-warning/60' },
  error: { icon: OctagonX, className: 'text-destructive', border: 'border-destructive/60' },
};

/** How long a toast stays; errors stay longer. */
const TIMEOUT_MS: Record<ToastKind, number> = { info: 4000, success: 4000, warning: 4000, error: 7000 };

function isToastKind(value: string | undefined): value is ToastKind {
  return value !== undefined && value in TOAST_STYLES;
}

function ToastList() {
  const t = useTranslations('dialogs');
  const { toasts } = useToastManager();
  return toasts.map((toast) => {
    const kind = isToastKind(toast.type) ? toast.type : 'info';
    const { icon: Icon, className, border } = TOAST_STYLES[kind];
    return (
      <Toast key={toast.id} toast={toast} className={cn('rounded-lg shadow-md', border)}>
        <ToastContent className="items-start gap-2.5 px-3 py-2.5">
          <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', className)} />
          <ToastDescription className="min-w-0 flex-1 text-sm text-popover-foreground" />
          <ToastClose aria-label={t('toast.dismiss')} className="-my-1 -mr-1" />
        </ToastContent>
      </Toast>
    );
  });
}

export function Toasts() {
  const [manager] = useState(createToastManager);

  // Takes over queued notices as they arrive
  useEffect(() => {
    const show = () => {
      for (const toast of takeToasts()) {
        manager.add({
          id: String(toast.id),
          type: toast.kind,
          description: toast.message,
          timeout: TIMEOUT_MS[toast.kind],
          priority: toast.kind === 'error' ? 'high' : 'low',
        });
      }
    };
    show();
    return useNotificationStore.subscribe(show);
  }, [manager]);

  return (
    <ToastProvider toastManager={manager} limit={5}>
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}
