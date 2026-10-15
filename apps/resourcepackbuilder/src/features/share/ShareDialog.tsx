import { useEffect, useId, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { FolderOpen, FolderSync, RefreshCw, TriangleAlert, Unplug, Users } from 'lucide-react';
import { Tip } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldDescription, FieldLabel, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { DialogFrame } from '../../components/DialogFrame';
import { useErrorMessage } from '../../i18n/errors';
import { richTags } from '../../i18n/richTags';
import { useServices } from '../../services/servicesContext';
import type { ShareSync } from '../../services/shareSync';
import { closeDialog, confirm } from '../../store/dialogs';
import { toast } from '../../store/notifications';
import { useOpenProject } from '../../store/project';
import { isProjectShared, useShareStore } from '../../store/share';
import { ShareStatusBadge } from './shareStatus';

/** Longest name shown to the others. */
const MAX_USER_NAME_LENGTH = 40;

function UserNameField({ value, onChange, onCommit }: { value: string; onChange: (value: string) => void; onCommit?: () => void }) {
  const t = useTranslations('dialogs.share');
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{t('yourName')}</FieldLabel>
      <Input
        id={id}
        data-testid="share-user-name"
        className="max-w-sm"
        value={value}
        maxLength={MAX_USER_NAME_LENGTH}
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

/** The user name to share with: the stored one, else the system user name as a suggestion. */
function useUserName(shareSync: ShareSync) {
  const tState = useTranslations('state');
  const [name, setName] = useState(() => useShareStore.getState().userName);
  useEffect(() => {
    let isCurrent = true;
    void shareSync.defaultUserName().then((suggestion) => {
      if (isCurrent) setName((current) => current || suggestion);
    });
    return () => {
      isCurrent = false;
    };
  }, [shareSync]);
  /** The name to use: what was entered, or a placeholder name */
  const effective = () => name.trim() || tState('defaults.unknownUser');
  return { name, setName, effective };
}

/** Explains sharing and shares the open project via a folder the user picks. */
function StartSharing({ shareSync }: { shareSync: ShareSync }) {
  const t = useTranslations('dialogs.share');
  const tState = useTranslations('state');
  const errorMessage = useErrorMessage();
  const project = useOpenProject();
  const userName = useUserName(shareSync);
  const [isStarting, setIsStarting] = useState(false);

  const start = async () => {
    setIsStarting(true);
    try {
      const folder = await shareSync.share(project.name || tState('defaults.sharedProjectFolder'), userName.effective());
      if (folder) toast('success', t('started', { folder }));
    } catch (err) {
      toast('error', errorMessage(err));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t('intro')}</p>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
        <li>{t.rich('step1', richTags)}</li>
        <li>{t.rich('step2', richTags)}</li>
        <li>{t.rich('step3', richTags)}</li>
      </ol>
      <UserNameField value={userName.name} onChange={userName.setName} />
      <Button size="lg" className="self-start" disabled={isStarting} onClick={() => void start()}>
        {isStarting ? <Spinner /> : <FolderSync />} {t('start')}
      </Button>
    </div>
  );
}

/** State of the shared open project: status, folder, own name; stop sharing. */
function SharedProject({ shareSync }: { shareSync: ShareSync }) {
  const t = useTranslations('dialogs.share');
  const tState = useTranslations('state');
  const format = useFormatter();
  const errorMessage = useErrorMessage();
  const share = useShareStore();
  const userName = useUserName(shareSync);
  const problem = share.status === 'error' ? errorMessage(share.error) : share.status === 'offline' ? tState('share.offline') : null;

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <ShareStatusBadge status={share.status} />
        {share.lastSync && (
          <span className="text-xs text-muted-foreground">
            {t('lastSync', { time: format.dateTime(new Date(share.lastSync), { timeStyle: 'medium' }) })}
          </span>
        )}
        <Tip label={t('syncNowTitle')}>
          <Button variant="outline" size="sm" className="ml-auto" onClick={shareSync.syncNow}>
            <RefreshCw /> {t('syncNow')}
          </Button>
        </Tip>
      </div>
      {problem && (
        <Alert variant={share.status === 'error' ? 'warning' : 'default'}>
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      )}
      <Field>
        <FieldTitle>{t('sharedFolder')}</FieldTitle>
        <div className="flex items-center gap-2">
          <Tip label={share.folder}>
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2 py-1.5 font-mono text-xs">{share.folder}</code>
          </Tip>
          <Button variant="outline" size="sm" onClick={shareSync.openFolder}>
            <FolderOpen /> {t('openFolder')}
          </Button>
        </div>
      </Field>
      <UserNameField value={userName.name} onChange={userName.setName} onCommit={() => void shareSync.setUserName(userName.effective())} />
      <Alert variant="info">
        <AlertDescription>{t('sharedHint')}</AlertDescription>
      </Alert>
      <Button variant="ghost" className="self-start text-destructive hover:text-destructive" onClick={() => void confirmStop()}>
        <Unplug /> {t('stop')}
      </Button>
    </div>
  );
}

export function ShareDialog() {
  const t = useTranslations('dialogs.share');
  const tCommon = useTranslations('common');
  const shareSync = useServices().share;
  const project = useOpenProject();
  const isShared = useShareStore((share) => isProjectShared(share, project.id));
  return (
    <DialogFrame title={t('title')} icon={<Users />} footer={<Button onClick={closeDialog}>{tCommon('done')}</Button>}>
      {!shareSync ? (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>{t('desktopOnly')}</AlertDescription>
        </Alert>
      ) : isShared ? (
        <SharedProject shareSync={shareSync} />
      ) : (
        <StartSharing shareSync={shareSync} />
      )}
    </DialogFrame>
  );
}
