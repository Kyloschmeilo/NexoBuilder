/** How the share status is shown: one tone and one text per status, used by the top bar and the share dialog. */
import { useTranslations } from 'next-intl';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { StatusBadge, type Tone } from '@resourcepackbuilder/ui';
import type { ShareStatus } from '../../store/share';

export const SHARE_STATUS_TONE: Record<ShareStatus, Tone> = {
  off: 'neutral',
  connecting: 'busy',
  synced: 'success',
  syncing: 'busy',
  offline: 'warning',
  error: 'error',
};

/** Returns the function that names a share status in the current language. */
export function useShareStatusText(): (status: ShareStatus) => string {
  const t = useTranslations('dialogs.share.status');
  return (status) => t(status);
}

/** The share status as a coloured badge, with a spinner while busy. */
export function ShareStatusBadge({ status }: { status: ShareStatus }) {
  const statusText = useShareStatusText();
  const tone = SHARE_STATUS_TONE[status];
  return (
    <span data-testid="share-status" data-status={status} className="inline-flex">
      <StatusBadge tone={tone}>
        {tone === 'busy' && <Spinner />}
        {statusText(status)}
      </StatusBadge>
    </span>
  );
}
