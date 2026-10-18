import { FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { CopyButton, Section, Tip } from '@resourcepackbuilder/ui';
import { richTags } from '../../i18n/richTags';
import { DEFAULT_PACK_TARGET } from '@resourcepackbuilder/core/project';
import { isConfigLocked, serverAdapterFor } from '@resourcepackbuilder/test-server';
import { useProjectStore } from '../../store/project';
import type { TestServerState } from '../../platform/desktopApi';
import { PackStatus } from './PackStatus';
import { useTestServer } from './useTestServer';

/** How to join the server, the server folder and – while it runs with its plugin – the resource pack status. */
export function ConnectCard({ server }: { server: TestServerState }) {
  const t = useTranslations('media.testServer');
  const tCommon = useTranslations('common');
  const tUi = useTranslations('ui');
  const testServer = useTestServer();
  const { config } = server;
  const projectTarget = useProjectStore((s) => s.project?.target ?? DEFAULT_PACK_TARGET);
  // A server that is up runs its own plugin; otherwise the next start uses the open project's
  const adapter = serverAdapterFor(server.target && isConfigLocked(server.status) ? server.target : projectTarget);
  const hasPlugin = Boolean(config.pluginJars[adapter.target]);
  const isRunning = server.status === 'running';

  return (
    <Section
      id="connect"
      title={t.rich(isRunning ? 'connect' : 'connectLater', { ...richTags, version: config.paperVersion ?? '–', address: server.address })}
      description={t('connectHint', { plugin: adapter.pluginName })}
      actions={
        <>
          <CopyButton text={server.address} label={tCommon('copy')} copiedLabel={tUi('copyButton.copied')} />
          <Tip label={t('openFolder')}>
            <Button variant="outline" size="sm" onClick={testServer.openFolder}>
              <FolderOpen /> {t('folder')}
            </Button>
          </Tip>
        </>
      }
    >
      {isRunning && hasPlugin ? <PackStatus pack={server.pack} player={config.playerName} adapter={adapter} /> : undefined}
    </Section>
  );
}
