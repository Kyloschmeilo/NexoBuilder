import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { countIssues } from '@resourcepackbuilder/utils';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { SectionCard } from '@resourcepackbuilder/ui';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { CheckboxField } from '../../components/CheckboxField';
import { useErrorMessage } from '../../i18n/errors';
import type { TestServerState } from '../../platform/desktopApi';
import { usePlan } from '../../shell/PlanProvider';
import { useTestServerStore } from '../../services/testServerStore';
import { syncSummary, type SyncSummaryPart } from '@resourcepackbuilder/test-server';
import { useSetConfig, useTestServer } from './useTestServer';

/** Transfer of the project into the server: manual, automatic, and how the last transfers went. */
export function SyncCard({ server }: { server: TestServerState }) {
  const t = useTranslations('media.testServer.sync');
  const testServer = useTestServer();
  const setConfig = useSetConfig();
  const errorMessage = useErrorMessage();
  const plan = usePlan();
  const isSyncing = useTestServerStore((s) => s.isSyncing);
  const lastResult = useTestServerStore((s) => s.lastResult);
  const lastCheck = useTestServerStore((s) => s.lastCheck);
  const syncError = useTestServerStore((s) => s.syncError);
  const isRunning = server.status === 'running';
  const errorCount = plan ? countIssues(plan.issues).error : 0;
  const summary = useSummaryText(syncSummary({ lastResult, lastCheck, syncError }, isRunning));

  return (
    <SectionCard
      size="sm"
      title={t('title')}
      description={t('description')}
      actions={
        <Button variant="outline" size="sm" disabled={!isRunning || isSyncing} onClick={() => void testServer.sync(true)}>
          {isSyncing ? <Spinner /> : <RefreshCw />} {t('now')}
        </Button>
      }
      contentClassName="flex flex-col gap-2"
    >
      <CheckboxField
        checked={server.config.autoUpdate}
        onChange={(checked) => setConfig({ autoUpdate: checked })}
        label={t('auto')}
        description={t('autoHint')}
      />
      {summary && <div className="text-xs text-muted-foreground">{summary}</div>}
      {syncError !== null && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>{t('failed', { error: errorMessage(syncError) })}</AlertDescription>
        </Alert>
      )}
      {errorCount > 0 && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>{t('projectErrors', { count: errorCount })}</AlertDescription>
        </Alert>
      )}
    </SectionCard>
  );
}

/** Words the summary parts as one paragraph. */
function useSummaryText(parts: SyncSummaryPart[]): string {
  const t = useTranslations('media.testServer.sync');
  const format = useFormatter();
  const time = (at: number) => format.dateTime(new Date(at), { timeStyle: 'medium' });
  const sentence = (part: SyncSummaryPart) => {
    switch (part.key) {
      case 'last':
        return t('last', { time: time(part.at), written: part.written, deleted: part.deleted, reloaded: String(part.reloaded) });
      case 'onStart':
        return t('onStart');
      case 'upToDate':
        return t('upToDate', { time: time(part.at) });
      case 'skipped':
        return t('skipped', { count: part.count });
    }
  };
  return parts.map(sentence).join(' ');
}
