import { FolderOpen, Plug } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card } from '@resourcepackbuilder/ui/components/card';
import { CopyButton, Tip } from '@resourcepackbuilder/ui';
import { richTags } from '../../i18n/richTags';
import type { TestServerState } from '../../platform/desktopApi';
import { PackStatus } from './PackStatus';
import { useTestServer } from './useTestServer';

/** How to join the server, the server folder and – while it runs with Nexo – the resource pack status. */
export function ConnectCard({ server }: { server: TestServerState }) {
  const t = useTranslations('media.testServer');
  const testServer = useTestServer();
  const { config } = server;

  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="flex flex-wrap items-center gap-3.5 px-4 py-3">
        <Plug className="size-5 flex-none text-muted-foreground" />
        <div className="min-w-0 flex-[1_1_12rem]">
          <div className="font-semibold break-words">
            {t.rich('connect', { ...richTags, version: config.paperVersion ?? '', address: server.address })}
          </div>
          <div className="text-xs text-muted-foreground">{t('connectHint')}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={server.address} />
          <Tip label={t('openFolder')}>
            <Button variant="outline" size="sm" onClick={testServer.openFolder}>
              <FolderOpen /> {t('folder')}
            </Button>
          </Tip>
        </div>
      </div>
      {server.status === 'running' && config.nexoJar && <PackStatus pack={server.pack} player={config.playerName} />}
    </Card>
  );
}
