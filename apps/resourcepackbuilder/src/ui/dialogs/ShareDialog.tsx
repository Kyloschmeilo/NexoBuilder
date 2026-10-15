import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { FolderOpen, FolderSync, LoaderCircle, RefreshCw, TriangleAlert, Unplug, Users } from 'lucide-react';
import { cn } from 'cn';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldDescription, FieldLabel, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { translator } from '../../i18n/locale';
import { errorMessage } from '../../i18n/errors';
import { useStore } from '../../state/store';
import {
  defaultUserName,
  isShareAvailable,
  openShareFolder,
  setShareUserName,
  shareCurrentProject,
  stopSharing,
  syncNow,
  useShareStore,
  type ShareStatus,
} from '../../state/share';
import { AppDialog, richTags } from './AppDialog';

/** Message key (in `dialogs`) of the text for each share status. */
export const SHARE_STATUS_KEYS = {
  off: 'share.status.off',
  connecting: 'share.status.connecting',
  synced: 'share.status.synced',
  syncing: 'share.status.syncing',
  offline: 'share.status.offline',
  error: 'share.status.error',
} as const satisfies Record<ShareStatus, string>;

/** The share status text in the current language, for components (re-renders on a language change). */
export function useShareStatusText(): (status: ShareStatus) => string {
  const t = useTranslations('dialogs');
  return (status) => t(SHARE_STATUS_KEYS[status]);
}

/**
 * @deprecated use {@link useShareStatusText} (components) or {@link SHARE_STATUS_KEYS}. Kept so existing callers
 * still get the text in the current language.
 */
export const SHARE_STATUS_TEXT: Readonly<Record<ShareStatus, string>> = new Proxy({} as Record<ShareStatus, string>, {
  get: (_, status) => translator('dialogs')(SHARE_STATUS_KEYS[status as ShareStatus]),
});

export function shareStatusClass(status: ShareStatus): string {
  return status === 'synced' ? 'success' : status === 'error' ? 'danger' : status === 'off' ? '' : 'warning';
}

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
  const tc = useTranslations('common');
  const statusText = useShareStatusText();
  const format = useFormatter();
  const close = useStore((s) => s.closeDialog);
  const toast = useStore((s) => s.toast);
  const project = useStore((s) => s.project)!;
  const share = useShareStore();
  const available = isShareAvailable();
  const shared = share.projectId === project.id && share.status !== 'off';
  const [name, setName] = useState(share.userName);
  const [busy, setBusy] = useState(false);

  // Suggested name: Windows user name
  useEffect(() => {
    void defaultUserName().then((n) => setName((current) => current || n));
  }, []);

  const startSharing = async () => {
    setBusy(true);
    try {
      const folder = await shareCurrentProject(name);
      if (folder) toast('success', t('started', { folder }));
    } catch (err) {
      toast('error', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmStop = () =>
    useStore.getState().openDialog({
      type: 'confirm',
      title: t('stopConfirm.title'),
      message: t('stopConfirm.message'),
      confirmLabel: t('stop'),
      danger: true,
      onConfirm: () =>
        void stopSharing().then(() => {
          toast('info', translator('dialogs')('share.stopped'));
          useStore.getState().openDialog({ type: 'share' });
        }),
    });

  return (
    <AppDialog title={t('title')} icon={<Users />} footer={<Button onClick={close}>{tc('done')}</Button>}>
      {!available ? (
        <Alert className="border-warning/50 bg-warning/10">
          <TriangleAlert className="text-warning" />
          <AlertDescription className="text-foreground">{t('desktopOnly')}</AlertDescription>
        </Alert>
      ) : shared ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className={cn('gap-1 border-transparent', STATUS_BADGE[share.status])}>
              {share.status === 'syncing' || share.status === 'connecting' ? <LoaderCircle className="animate-spin" /> : null}
              {statusText(share.status)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {share.lastSync ? t('lastSync', { time: format.dateTime(new Date(share.lastSync), { timeStyle: 'medium' }) }) : ''}
            </span>
            <span className="flex-1" />
            <Button variant="outline" size="sm" onClick={syncNow} title={t('syncNowTitle')}>
              <RefreshCw /> {t('syncNow')}
            </Button>
          </div>
          {share.message && (
            <Alert className={cn(share.status === 'error' && 'border-warning/50 bg-warning/10')}>
              <AlertDescription className="text-foreground">{share.message}</AlertDescription>
            </Alert>
          )}
          <Field>
            <FieldTitle>{t('sharedFolder')}</FieldTitle>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2 py-1.5 font-mono text-xs" title={share.folder ?? ''}>
                {share.folder}
              </code>
              <Button variant="outline" size="sm" onClick={openShareFolder}>
                <FolderOpen /> {t('openFolder')}
              </Button>
            </div>
          </Field>
          <NameField value={name} onChange={setName} onCommit={() => void setShareUserName(name)} />
          <Alert>
            <AlertDescription>{t('sharedHint')}</AlertDescription>
          </Alert>
          <Button variant="ghost" className="self-start text-destructive hover:text-destructive" onClick={confirmStop}>
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
    </AppDialog>
  );
}
