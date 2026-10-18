import { Server, TriangleAlert } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@resourcepackbuilder/ui/components/empty';
import { Progress } from '@resourcepackbuilder/ui/components/progress';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { Page, PageHeader, StatusPill } from '@resourcepackbuilder/ui';
import type { TestServerState } from '../../platform/desktopApi';
import { useServices } from '../../services/bootstrap';
import { useTestServerStore } from '../../services/testServerStore';
import { ConnectCard } from './ConnectCard';
import { ServerConsole } from './ServerConsole';
import { ServerControls } from './ServerControls';
import { ServerSetup } from './ServerSetup';
import { isConfigLocked, isTransitioning } from '@resourcepackbuilder/test-server';
import { DEFAULT_PACK_TARGET } from '@resourcepackbuilder/core/project';
import { useErrorMessage } from '../../i18n/errors';
import { useProjectStore } from '../../store/project';
import { serverRunsOtherTarget, wrongTargetError } from '../../services/testServerSync';
import { TEST_SERVER_PILL_TONE } from './status';
import { SyncCard } from './SyncCard';

export function TestServerView() {
  const t = useTranslations('media.testServer');
  const tCommon = useTranslations('common');
  const isAvailable = useServices().testServer !== null;
  const server = useTestServerStore((s) => s.server);

  if (!isAvailable) {
    return (
      <Page>
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>{t('desktopOnly')}</AlertDescription>
        </Alert>
      </Page>
    );
  }
  if (!server) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>{tCommon('loading')}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  return <TestServerPage server={server} />;
}

function TestServerPage({ server }: { server: TestServerState }) {
  const t = useTranslations('media.testServer');
  const format = useFormatter();
  const errorMessage = useErrorMessage();
  const isWorking = isTransitioning(server.status);
  const { config, installed } = server;
  const target = useProjectStore((s) => s.project?.target ?? DEFAULT_PACK_TARGET);
  const hasPlugin = Boolean(config.pluginJars[target]);
  // Until everything a start needs is set, the setup comes first
  const isReady = config.eulaAccepted && config.paperVersion !== null && hasPlugin;
  const setup = <ServerSetup config={config} isLocked={isConfigLocked(server.status)} isReady={isReady} target={target} />;

  return (
    <Page>
      <PageHeader
        icon={<Server className="size-7 text-primary" />}
        title={t('title')}
        status={
          <span data-testid="test-server-status" data-status={server.status} className="inline-flex">
            <StatusPill dot tone={TEST_SERVER_PILL_TONE[server.status]} label={t(`status.${server.status}`)} />
          </span>
        }
        meta={
          <>
            {installed && (
              <Badge variant="outline" className="font-mono" data-testid="test-server-version-label">
                {t('installed', { paper: installed.paperVersion, java: installed.javaVersion })}
              </Badge>
            )}
            {server.status === 'running' && server.startedAt !== null && (
              <Badge variant="secondary">
                {t('since', { time: format.dateTime(new Date(server.startedAt), { timeStyle: 'medium' }) })}
              </Badge>
            )}
          </>
        }
        actions={<ServerControls server={server} />}
      />

      <div className="flex flex-col gap-3">
        {/* server.message comes from the desktop process, which already writes it in the app's language */}
        {server.message && (
          <Alert variant={server.status === 'error' ? 'warning' : 'info'}>
            {isWorking && <Spinner />}
            <AlertDescription className="flex items-center gap-3">
              <span>{server.message}</span>
              {server.progress !== null && <Progress className="flex-1" value={server.progress} />}
            </AlertDescription>
          </Alert>
        )}
        {server.target && serverRunsOtherTarget(server, target) && (
          <Alert variant="warning">
            <TriangleAlert />
            <AlertDescription>{errorMessage(wrongTargetError(server.target, target))}</AlertDescription>
          </Alert>
        )}

        {!isReady && setup}
        <ConnectCard server={server} />
        <SyncCard server={server} />
        <ServerConsole />
        {isReady && setup}
      </div>
    </Page>
  );
}
