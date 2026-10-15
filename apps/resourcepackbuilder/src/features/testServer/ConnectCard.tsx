import { FolderOpen, Plug } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { CopyButton, SectionCard, Tip } from '@resourcepackbuilder/ui';
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
    <SectionCard
      size="sm"
      icon={<Plug className="size-5 flex-none text-muted-foreground" />}
      title={t.rich('connect', { ...richTags, version: config.paperVersion ?? '', address: server.address })}
      titleClassName="font-sans tracking-normal normal-case"
      description={t('connectHint')}
      actions={
        <>
          <CopyButton text={server.address} />
          <Tip label={t('openFolder')}>
            <Button variant="outline" size="sm" onClick={testServer.openFolder}>
              <FolderOpen /> {t('folder')}
            </Button>
          </Tip>
        </>
      }
      contentClassName="py-3"
    >
      {server.status === 'running' && config.nexoJar ? <PackStatus pack={server.pack} player={config.playerName} /> : undefined}
    </SectionCard>
  );
}
