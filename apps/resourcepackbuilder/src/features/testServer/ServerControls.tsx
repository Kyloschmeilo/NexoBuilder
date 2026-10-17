import { Play, RotateCcw, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Tip } from '@resourcepackbuilder/ui';
import type { TestServerState } from '../../platform/desktopApi';
import { isTransitioning } from '@resourcepackbuilder/test-server';
import { useBusyAction } from '../../hooks/useBusyAction';
import { useTestServer } from './useTestServer';

/** Start – or restart and stop while the server is up or on its way. */
export function ServerControls({ server }: { server: TestServerState }) {
  const t = useTranslations('media.testServer');
  const testServer = useTestServer();
  const { isBusy, run } = useBusyAction();
  const { status, config } = server;
  const isWorking = isTransitioning(status);

  if (status === 'running' || isWorking) {
    return (
      <>
        <Button variant="outline" disabled={isBusy || isWorking} onClick={() => void run(testServer.restart)}>
          <RotateCcw /> {t('restart')}
        </Button>
        <Button
          variant="destructive"
          disabled={status === 'stopping' || (isBusy && status !== 'preparing')}
          onClick={() => void run(testServer.stop)}
        >
          <Square /> {t('stop')}
        </Button>
      </>
    );
  }

  const missing = !config.eulaAccepted ? t('missingEula') : !config.paperVersion ? t('missingVersion') : null;
  return (
    <Tip label={missing}>
      <Button size="lg" disabled={isBusy || missing !== null} onClick={() => void run(testServer.start)}>
        <Play /> {t('start')}
      </Button>
    </Tip>
  );
}
