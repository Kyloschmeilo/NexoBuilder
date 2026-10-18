/** The UI of `confirm()` from the dialog store: an alert dialog in the frame of the other dialogs. */
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
import { DIALOG_POPUP_CLASS, DIALOG_TITLE_CLASS } from '../components/DialogFrame';
import type { Question } from '../store/dialogs';

/** Asks a yes/no question; the confirm button has the focus and is red for destructive questions. */
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
      <AlertDialogContent initialFocus={confirmRef} className={`gap-0 p-0 sm:max-w-120 ${DIALOG_POPUP_CLASS}`}>
        <AlertDialogHeader className="place-items-start gap-1.5 px-4 pt-3.5 pb-4 text-left">
          <AlertDialogTitle className={DIALOG_TITLE_CLASS}>{options.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-body whitespace-pre-line text-text-muted">{options.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mx-0 mb-0 rounded-none border-t border-line bg-transparent px-4 py-2.5">
          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
          <Button ref={confirmRef} variant={options.destructive ? 'destructive-solid' : 'default'} onClick={() => resolve(true)}>
            {options.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
