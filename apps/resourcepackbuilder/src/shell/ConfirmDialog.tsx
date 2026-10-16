import { useRef } from 'react';
import { useTranslations } from 'next-intl';
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
import type { Question } from '../store/dialogs';

/** The UI of `confirm()` from the dialog store. */
export function ConfirmDialog({ question: { options, resolve } }: { question: Extract<Question, { kind: 'confirm' }> }) {
  const tCommon = useTranslations('common');
  const confirmRef = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) resolve(false);
      }}
    >
      <AlertDialogContent initialFocus={confirmRef}>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{options.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
          <Button ref={confirmRef} variant={options.destructive ? 'destructive-solid' : 'default'} onClick={() => resolve(true)}>
            {options.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
