/**
 * A dialog that shows the details of one row of the Block section (an appearance's model options, a variant's
 * settings, the entity renderer, a behavior's keys), so the rows themselves stay short. Edits apply right away; "Done" closes it.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Dialog, DialogClose } from '@resourcepackbuilder/ui/components/dialog';
import { DialogFrame } from '../../../components/DialogFrame';

export function DetailDialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'normal',
  footerStart,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: 'narrow' | 'normal' | 'wide';
  /** Footer content on the left, e.g. a destructive "Remove" button. */
  footerStart?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations('common');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogFrame
          title={title}
          description={description}
          size={size}
          footerStart={footerStart}
          footer={<DialogClose render={<Button />}>{t('done')}</DialogClose>}
        >
          {children}
        </DialogFrame>
      )}
    </Dialog>
  );
}
