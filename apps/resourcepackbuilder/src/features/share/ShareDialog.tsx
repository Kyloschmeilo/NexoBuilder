import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { FolderOpen, FolderSync, LoaderCircle, RefreshCw, TriangleAlert, Unplug, Users } from 'lucide-react';
import { cn } from 'cn';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldDescription, FieldLabel, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { DialogFrame } from '../../components/DialogFrame';
import { useErrorMessage } from '../../i18n/errors';
import { richTags } from '../../i18n/richTags';
import { useServices } from '../../services/servicesContext';
import type { ShareSync } from '../../services/shareSync';
import { closeDialog, confirm } from '../../store/dialogs';
import { toast } from '../../store/notifications';
import { useOpenProject } from '../../store/project';
import { useShareStore, type ShareStatus } from '../../store/share';

/** Message key (in `dialogs`) of the text for each share status. */
const SHARE_STATUS_KEYS = {
  off: 'share.status.off',
  connecting: 'share.status.connecting',
  synced: 'share.status.synced',
  syncing: 'share.status.syncing',
  offline: 'share.status.offline',
  error: 'share.status.error',
} as const satisfies Record<ShareStatus, string>;

const STATUS_BADGE: Record<ShareStatus, string> = {
  off: 'border-border bg-transparent text-muted-foreground',
  connecting: 'bg-warning/15 text-warning',
  synced: 'bg-success/15 text-success',
  syncing: 'bg-warning/15 text-warning',
  offline: 'bg-warning/15 text-warning',
  error: 'bg-destructive/15 text-destructive',
};

function NameField({ value, onChange, onCommit }: { value: string; onChange: (v: string) => void; onCommit?: () => void }) {
  const t = useTranslations('dialogs.share');
  return (
    <Field>
      <FieldLabel htmlFor="share-user-name">{t('yourName')}</FieldLabel>
      <Input
        id="share-user-name"
        className="max-w-sm"
        value={value}
        maxLength={40}
        placeholder={t('namePlaceholder')}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit?.();
        }}
      />
      <FieldDescription>{t('nameHelp')}</FieldDescription>
    </Field>
  );
}

export function ShareDialog() {
  const t = useTranslations('dialogs.share');
  const tCommon = useTranslations('common');
  const shareSync = useServices().share;
  return (
    <DialogFrame title={t('title')} icon={<Users />} footer={<Button onClick={closeDialog}>{tCommon('done')}</Button>}>
      {shareSync ? (
        <ShareSettings shareSync={shareSync} />
      ) : (
        <Alert className="border-warning/50 bg-warning/10">
          <TriangleAlert className="text-warning" />
          <AlertDescription className="text-foreground">{t('desktopOnly')}</AlertDescription>
        </Alert>
      )}
    </DialogFrame>
  );
}

function ShareSettings({ shareSync }: { shareSync: ShareSync }) {
  const t = useTranslations('dialogs.share');
  const tDialogs = useTranslations('dialogs');
  const tState = useTranslations('state');
  const format = useFormatter();
  const errorMessage = useErrorMessage();
  const project = useOpenProject();
  const share = useShareStore();
  const shared = share.projectId === project.id && share.status !== 'off';
  const [name, setName] = useState(share.userName);
  const [busy, setBusy] = useState(false);
  const message = share.status === 'error' ? errorMessage(share.error) : share.status === 'offline' ? tState('share.offline') : null;
  const userName = () => name.trim() || tState('defaults.unknownUser');

  // Suggested name: Windows user name
  useEffect(() => {
    void shareSync.defaultUserName().then((n) => setName((current) => current || n));
  }, [shareSync]);

  const startSharing = async () => {
    setBusy(true);
    try {
      const folder = await shareSync.share(project.name || tState('defaults.sharedProjectFolder'), userName());
      if (folder) toast('success', t('started', { folder }));
    } catch (err) {
      toast('error', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmStop = async () => {
    const confirmed = await confirm({
      title: t('stopConfirm.title'),
      message: t('stopConfirm.message'),
      confirmLabel: t('stop'),
      destructive: true,
    });
    if (!confirmed) return;
    await shareSync.stop();
    toast('info', t('stopped'));
  };

  return (
    <>
      {shared ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className={cn('gap-1 border-transparent', STATUS_BADGE[share.status])}>
              {share.status === 'syncing' || share.status === 'connecting' ? <LoaderCircle className="animate-spin" /> : null}
              {tDialogs(SHARE_STATUS_KEYS[share.status])}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {share.lastSync ? t('lastSync', { time: format.dateTime(new Date(share.lastSync), { timeStyle: 'medium' }) }) : ''}
            </span>
            <span className="flex-1" />
            <Button variant="outline" size="sm" onClick={shareSync.syncNow} title={t('syncNowTitle')}>
              <RefreshCw /> {t('syncNow')}
            </Button>
          </div>
          {message && (
            <Alert className={cn(share.status === 'error' && 'border-warning/50 bg-warning/10')}>
              <AlertDescription className="text-foreground">{message}</AlertDescription>
            </Alert>
          )}
          <Field>
            <FieldTitle>{t('sharedFolder')}</FieldTitle>
            <div className="flex items-center gap-2">
              <code
                className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2 py-1.5 font-mono text-xs"
                title={share.folder ?? ''}
              >
                {share.folder}
              </code>
              <Button variant="outline" size="sm" onClick={shareSync.openFolder}>
                <FolderOpen /> {t('openFolder')}
              </Button>
            </div>
          </Field>
          <NameField value={name} onChange={setName} onCommit={() => void shareSync.setUserName(userName())} />
          <Alert>
            <AlertDescription>{t('sharedHint')}</AlertDescription>
          </Alert>
          <Button variant="ghost" className="self-start text-destructive hover:text-destructive" onClick={() => void confirmStop()}>
            <Unplug /> {t('stop')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-muted-foreground">{t('intro')}</p>
          <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-sm">
            <li>{t.rich('step1', richTags)}</li>
            <li>{t.rich('step2', richTags)}</li>
            <li>{t.rich('step3', richTags)}</li>
          </ol>
          <NameField value={name} onChange={setName} />
          <Button size="lg" className="self-start" disabled={busy} onClick={() => void startSharing()}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FolderSync />} {t('start')}
          </Button>
        </div>
      )}
    </>
  );
}
