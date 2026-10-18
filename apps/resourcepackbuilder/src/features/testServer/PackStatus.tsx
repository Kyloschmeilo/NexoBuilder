import { RefreshCw, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { StatusPill, Tip } from '@resourcepackbuilder/ui';
import { PLAYER_NAME_PATTERN, type ServerAdapter } from '@resourcepackbuilder/test-server';
import type { TestServerState } from '../../platform/desktopApi';
import { PACK_PILL_TONE } from './status';
import { useBusyAction } from '../../hooks/useBusyAction';
import { useTestServer } from './useTestServer';

/** What the plugin is currently doing with the resource pack (read from the server output), with reload and resend. */
export function PackStatus({ pack, player, adapter }: { pack: TestServerState['pack']; player: string; adapter: ServerAdapter }) {
  const t = useTranslations('media.testServer.pack');
  const testServer = useTestServer();
  const { isBusy, run } = useBusyAction();
  const isValidPlayer = PLAYER_NAME_PATTERN.test(player);
  const detail = pack.status === 'failed' || pack.status === 'ready' ? pack.message : null;
  const plugin = adapter.pluginName;
  const resendCommand = isValidPlayer ? adapter.resendPackCommand(player) : null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <StatusPill dot tone={PACK_PILL_TONE[pack.status]} label={t(pack.status)} />
      <Tip label={detail}>
        <span className="min-w-0 flex-[1_1_8rem] truncate font-mono text-xs text-muted-foreground">{detail}</span>
      </Tip>
      <div className="flex flex-wrap gap-2">
        <Tip label={t('reloadHint', { plugin })}>
          <Button variant="outline" size="sm" disabled={isBusy || pack.status === 'building'} onClick={() => void run(testServer.reload)}>
            <RefreshCw /> {t('reload', { plugin })}
          </Button>
        </Tip>
        <Tip label={isValidPlayer ? t('resendHint', { player }) : t('enterName')}>
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy || pack.status !== 'ready' || resendCommand === null}
            onClick={() => void run(() => testServer.command(resendCommand ?? ''))}
          >
            <Upload /> {t('resend')}
          </Button>
        </Tip>
      </div>
    </div>
  );
}
