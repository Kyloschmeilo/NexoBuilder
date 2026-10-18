/** The sharing state of the open project on the settings page, with the way into the share dialog. */
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FieldRow } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { useServices } from '../../services/bootstrap';
import { isProjectShared, useShareStore } from '../../services/shareStore';
import { useOpenProject } from '../../store/project';
import { shareDialog } from '../share/ShareDialog';
import { ShareStatusBadge } from '../share/ShareStatusBadge';

/** Whether and where the project is shared; the dialog starts, changes and stops sharing. */
export function SharingSettings() {
  const t = useTranslations('dialogs.settings.sharing');
  const tShare = useTranslations('dialogs.share');
  const isAvailable = useServices().share !== null;
  const project = useOpenProject();
  const share = useShareStore();
  const isShared = isProjectShared(share, project.id);
  if (!isAvailable) {
    return (
      <FieldRow label={t('status')}>
        <p className="m-0 flex min-h-7.5 items-center text-body text-text-muted">{t('desktopOnly')}</p>
      </FieldRow>
    );
  }
  return (
    <FieldRow
      label={t('status')}
      help={isShared && share.folder ? <span className="font-mono break-all">{share.folder}</span> : undefined}
      helpInline
    >
      <div className="flex min-h-7.5 flex-wrap items-center gap-2">
        <ShareStatusBadge status={isShared ? share.status : 'off'} />
        <Button variant="outline" size="sm" onClick={() => shareDialog.open(null)}>
          <Users /> {isShared ? t('manage') : tShare('title')}
        </Button>
      </div>
    </FieldRow>
  );
}
