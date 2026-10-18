/**
 * Mounts the shadcn toaster that shows the notices from `notify`, at the bottom centre of the page area (the
 * workbench keeps `--page-center-x` up to date), so toasts never cover the sidebar or the output dock.
 */
import { useTranslations } from 'next-intl';
import { Toaster } from '@resourcepackbuilder/ui/components/toast';

/** Most toasts shown at once; older ones make room. */
const MAX_VISIBLE_TOASTS = 5;

/** Centres the viewport on the page; without a page (welcome screen) on the window. */
const VIEWPORT_CLASS = 'sm:right-auto sm:left-[var(--page-center-x,50%)] sm:-translate-x-1/2';

export function Toasts() {
  const t = useTranslations('dialogs');
  return <Toaster limit={MAX_VISIBLE_TOASTS} closeLabel={t('toast.dismiss')} viewportClassName={VIEWPORT_CLASS} />;
}
