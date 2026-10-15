/** Mounts the shadcn toaster that shows the notices from `notify`. */
import { useTranslations } from 'next-intl';
import { Toaster } from '@resourcepackbuilder/ui/components/toast';

/** Most toasts shown at once; older ones make room. */
const MAX_VISIBLE_TOASTS = 5;

export function Toasts() {
  const t = useTranslations('dialogs');
  return <Toaster limit={MAX_VISIBLE_TOASTS} closeLabel={t('toast.dismiss')} />;
}
