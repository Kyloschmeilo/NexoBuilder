import { Server, TriangleAlert } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@resourcepackbuilder/ui/components/empty';
import { Progress } from '@resourcepackbuilder/ui/components/progress';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { PageHeader, PageShell, StatusBadge } from '@resourcepackbuilder/ui';
import { Hint } from '../../components/Hint';
import type { TestServerState } from '../../platform/desktopApi';
import { useServices } from '../../services/servicesContext';
import { useTestServerStore } from '../../store/testServer';
import { ConnectCard } from './ConnectCard';
import { ServerConsole } from './ServerConsole';
import { ServerControls } from './ServerControls';
import { ServerSetup } from './ServerSetup';
import { isConfigLocked, isTransitioning, TEST_SERVER_STATUS_TONE } from './status';
import { SyncCard } from './SyncCard';

export function TestServerView() {
  const t = useTranslations('media.testServer');
  const tCommon = useTranslations('common');
  const isAvailable = useServices().testServer !== null;
  const server = useTestServerStore((s) => s.server);

  if (!isAvailable) {
    return (
      <PageShell>
        <Hint warning>
          <TriangleAlert className="size-4" />
          <span>{t('desktopOnly')}</span>
        </Hint>
      </PageShell>
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
  const isWorking = isTransitioning(server.status);
  const { config, installed } = server;

  return (
    <PageShell>
      <PageHeader
        icon={<Server className="size-7 text-primary" />}
        title={t('title')}
        meta={
          <>
            <StatusBadge tone={TEST_SERVER_STATUS_TONE[server.status]} data-testid="test-server-status" data-status={server.status}>
              {isWorking && <Spinner />}
              {t(`status.${server.status}`)}
            </StatusBadge>
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

      {/* server.message comes from the desktop process, which already writes it in the app's language */}
      {server.message && (
        <Hint warning={server.status === 'error'}>
          {isWorking && <Spinner />}
          <span>{server.message}</span>
          {server.progress !== null && <Progress className="flex-1 self-center" value={server.progress} />}
        </Hint>
      )}
      {!config.nexoJar && (
        <Hint warning>
          <TriangleAlert className="size-4" />
          <span>{t('noNexo')}</span>
        </Hint>
      )}

      <ConnectCard server={server} />
      <SyncCard server={server} />
      <ServerConsole />
      <ServerSetup config={config} isLocked={isConfigLocked(server.status)} />
    </PageShell>
  );
}
