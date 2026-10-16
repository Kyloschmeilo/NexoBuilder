import { RefreshCw, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { StatusBadge, Tip } from '@resourcepackbuilder/ui';
import { PLAYER_NAME_PATTERN } from '@resourcepackbuilder/core/testServer/config';
import { nexoPackCommand } from '@resourcepackbuilder/core/testServer/files';
import type { TestServerState } from '../../platform/desktopApi';
import { PACK_STATUS_TONE } from './status';
import { useBusyAction, useTestServer } from './useTestServer';

/** What Nexo is currently doing with the resource pack (read from the server output), with reload and resend. */
export function PackStatus({ pack, player }: { pack: TestServerState['pack']; player: string }) {
  const t = useTranslations('media.testServer.pack');
  const testServer = useTestServer();
  const { isBusy, run } = useBusyAction();
  const isValidPlayer = PLAYER_NAME_PATTERN.test(player);
  const detail = pack.status === 'failed' || pack.status === 'ready' ? pack.message : null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <StatusBadge tone={PACK_STATUS_TONE[pack.status]}>{t(pack.status)}</StatusBadge>
      <Tip label={detail}>
        <span className="min-w-0 flex-[1_1_8rem] truncate font-mono text-xs text-muted-foreground">{detail}</span>
      </Tip>
      <div className="flex flex-wrap gap-2">
        <Tip label={t('reloadHint')}>
          <Button variant="outline" size="sm" disabled={isBusy || pack.status === 'building'} onClick={() => void run(testServer.reload)}>
            <RefreshCw /> {t('reload')}
          </Button>
        </Tip>
        <Tip label={isValidPlayer ? t('resendHint', { player }) : t('enterName')}>
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy || pack.status !== 'ready' || !isValidPlayer}
            onClick={() => void run(() => testServer.command(nexoPackCommand(player)))}
          >
            <Upload /> {t('resend')}
          </Button>
        </Tip>
      </div>
    </div>
  );
}
