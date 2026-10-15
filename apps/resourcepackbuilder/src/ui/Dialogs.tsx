import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleCheck, Info, OctagonX, TriangleAlert } from 'lucide-react';
import { cn } from 'cn';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@resourcepackbuilder/ui/components/alert-dialog';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
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
import { useStore, type DialogState, type Toast as StoreToast } from '../state/store';
import { AppDialog } from './dialogs/AppDialog';

export function ConfirmDialog({ dialog }: { dialog: Extract<DialogState, { type: 'confirm' }> }) {
  const tc = useTranslations('common');
  const close = useStore((s) => s.closeDialog);
  const confirmRef = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <AlertDialogContent initialFocus={confirmRef}>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading">{dialog.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{dialog.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
          <Button
            ref={confirmRef}
            variant={dialog.danger ? 'destructive' : 'default'}
            className={cn(dialog.danger && 'bg-destructive text-destructive-foreground hover:bg-destructive/85 dark:bg-destructive')}
            onClick={() => {
              close();
              dialog.onConfirm();
            }}
          >
            {dialog.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PromptDialog({ dialog }: { dialog: Extract<DialogState, { type: 'prompt' }> }) {
  const t = useTranslations('dialogs');
  const tc = useTranslations('common');
  const close = useStore((s) => s.closeDialog);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(dialog.initial);
  const error = dialog.validate?.(value) ?? (value.trim() ? null : t('prompt.nameRequired'));
  const invalid = !!error && !!value;
  const submit = () => {
    if (error) return;
    close();
    dialog.onSubmit(value.trim());
  };
  return (
    <AppDialog
      title={dialog.title}
      size="narrow"
      initialFocus={inputRef}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {tc('cancel')}
          </Button>
          <Button disabled={!!error} onClick={submit}>
            {dialog.confirmLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor="prompt-dialog-input">{dialog.label}</FieldLabel>
          <Input
            ref={inputRef}
            id="prompt-dialog-input"
            aria-invalid={invalid}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          {invalid && <FieldError>{error}</FieldError>}
        </Field>
      </form>
    </AppDialog>
  );
}

/** Base UI toast manager that mirrors the store's toasts (the store keeps owning their lifetime). */
const toastManager = createToastManager();

const TOAST_ICONS: Record<StoreToast['kind'], { icon: typeof Info; className: string; border: string }> = {
  info: { icon: Info, className: 'text-info', border: 'border-border' },
  success: { icon: CircleCheck, className: 'text-success', border: 'border-success/60' },
  warning: { icon: TriangleAlert, className: 'text-warning', border: 'border-warning/60' },
  error: { icon: OctagonX, className: 'text-destructive', border: 'border-destructive/60' },
};

function isToastKind(value: string | undefined): value is StoreToast['kind'] {
  return value === 'info' || value === 'success' || value === 'warning' || value === 'error';
}

/** Forwards new store toasts to the toast manager and closes the ones the store dismissed. */
function useMirrorStoreToasts() {
  const toasts = useStore((s) => s.toasts);
  const shown = useRef(new Set<number>());
  useEffect(() => {
    const current = new Set(toasts.map((t) => t.id));
    for (const t of toasts) {
      if (shown.current.has(t.id)) continue;
      shown.current.add(t.id);
      toastManager.add({
        id: String(t.id),
        type: t.kind,
        description: t.message,
        // The store dismisses toasts on its own timer
        timeout: 0,
        priority: t.kind === 'error' ? 'high' : 'low',
        onClose: () => useStore.getState().dismissToast(t.id),
      });
    }
    for (const id of [...shown.current]) {
      if (current.has(id)) continue;
      shown.current.delete(id);
      toastManager.close(String(id));
    }
  }, [toasts]);
}

function ToastList() {
  const t = useTranslations('dialogs');
  const { toasts } = useToastManager();
  return toasts.map((toast) => {
    const kind = isToastKind(toast.type) ? toast.type : 'info';
    const { icon: Icon, className, border } = TOAST_ICONS[kind];
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
  useMirrorStoreToasts();
  return (
    <ToastProvider toastManager={toastManager} limit={5}>
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}
