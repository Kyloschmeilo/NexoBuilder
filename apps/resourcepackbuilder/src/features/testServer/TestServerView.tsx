import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FolderOpen, Play, Plug, RefreshCw, RotateCcw, Server, Square, Trash2, TriangleAlert, Upload } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { cn } from 'cn';
import { countIssues } from '@resourcepackbuilder/core/issues';
import { compareVersions } from '@resourcepackbuilder/core/minecraft/versions';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@resourcepackbuilder/ui/components/empty';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { Progress } from '@resourcepackbuilder/ui/components/progress';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { CopyButton, PageHeader, PageShell, StatusBadge, Tip, type Tone } from '@resourcepackbuilder/ui';
import { useDraft } from '../../components/editor/useDraft';
import { CheckRow } from '../../components/CheckRow';
import { FormField, FormGrid, FormHelp } from '../../components/FormField';
import { Hint } from '../../components/Hint';
import { useErrorMessage } from '../../i18n/errors';
import type { PackStatus as PackState, TestServerConfig, TestServerState, TestServerStatus } from '../../platform/desktopApi';
import { useServices } from '../../services/servicesContext';
import type { TestServerSync } from '../../services/testServerSync';
import { toast } from '../../store/notifications';
import { usePlan } from '../../store/PlanProvider';
import { useOpenProject } from '../../store/project';
import { useTestServerStore } from '../../store/testServer';

/** Tone per server status; the label is `media.testServer.status.<status>`. */
const STATUS_TONE: Record<TestServerStatus, Tone> = {
  stopped: 'neutral',
  preparing: 'busy',
  starting: 'busy',
  running: 'success',
  stopping: 'busy',
  error: 'error',
};

/** The test server service; this page is only shown with it (desktop program). */
function useTestServer(): TestServerSync {
  const testServer = useServices().testServer;
  if (!testServer) throw new Error('The test server is only available in the desktop program');
  return testServer;
}

const RAM_OPTIONS = [1, 2, 3, 4, 6, 8];

function useAction() {
  const errorMessage = useErrorMessage();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast('success', success);
    } catch (err) {
      toast('error', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function Console() {
  const t = useTranslations('media.testServer.console');
  const testServer = useTestServer();
  const log = useTestServerStore((s) => s.log);
  const status = useTestServerStore((s) => s.server?.status);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useLayoutEffect(() => {
    if (box.current && stick.current) box.current.scrollTop = box.current.scrollHeight;
  }, [log]);

  const send = () => {
    const text = command.trim().replace(/^\//, '');
    if (!text) return;
    void testServer.command(text);
    setHistory((h) => [text, ...h.filter((c) => c !== text)].slice(0, 30));
    setHistoryIndex(-1);
    setCommand('');
  };

  return (
    <Card size="sm" className="gap-0 py-0">
      <CardHeader className="py-3">
        <CardTitle className="font-heading">{t('title')}</CardTitle>
        <CardDescription className="text-xs">{t('description')}</CardDescription>
        <CardAction>
          <Tip label={t('clearHint')}>
            <Button variant="ghost" size="sm" onClick={() => void testServer.clearLog()}>
              <Trash2 /> {t('clear')}
            </Button>
          </Tip>
        </CardAction>
      </CardHeader>
      <div
        ref={box}
        className="h-[340px] overflow-auto border-y border-border bg-background px-4 py-3 font-mono text-xs leading-5"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {log.length === 0 ? (
          <div className="text-muted-foreground">{t('empty')}</div>
        ) : (
          log.map((entry, i) => (
            <div
              key={i}
              className={cn(
                'break-words whitespace-pre-wrap',
                entry.kind === 'err' ? 'text-destructive' : entry.kind === 'info' ? 'text-info' : 'text-muted-foreground',
              )}
            >
              {entry.line}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="font-mono text-muted-foreground">&gt;</span>
        <Input
          className="flex-1 font-mono"
          value={command}
          disabled={status !== 'running'}
          placeholder={status === 'running' ? t('placeholder') : t('notRunning')}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
            if (e.key === 'ArrowUp' && history.length) {
              const next = Math.min(historyIndex + 1, history.length - 1);
              setHistoryIndex(next);
              setCommand(history[next]);
              e.preventDefault();
            }
            if (e.key === 'ArrowDown') {
              const next = historyIndex - 1;
              setHistoryIndex(Math.max(next, -1));
              setCommand(next >= 0 ? history[next] : '');
              e.preventDefault();
            }
          }}
        />
        <Button variant="outline" size="sm" disabled={status !== 'running' || !command.trim()} onClick={send}>
          {t('send')}
        </Button>
      </div>
    </Card>
  );
}

function VersionSelect({ config, locked }: { config: TestServerConfig; locked: boolean }) {
  const t = useTranslations('media.testServer.setup');
  const testServer = useTestServer();
  const errorMessage = useErrorMessage();
  const projectVersion = useOpenProject().settings.minecraftVersion;
  const [versions, setVersions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchVersions = () =>
    testServer.paperVersions().then(
      (list) => setVersions([...list].sort((a, b) => compareVersions(b, a))),
      (err: unknown) => setError(errorMessage(err)),
    );
  const retry = () => {
    setError(null);
    void fetchVersions();
  };
  useEffect(() => {
    void fetchVersions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- load once per mount

  // Default: the project version – if there is no Paper for it (yet), the newest
  useEffect(() => {
    if (!versions?.length || config.paperVersion) return;
    void testServer.setConfig({ paperVersion: versions.includes(projectVersion) ? projectVersion : versions[0] });
  }, [versions, config.paperVersion, projectVersion, testServer]);

  const options = versions ?? (config.paperVersion ? [config.paperVersion] : []);
  return (
    <FormField
      label={t('version')}
      description={
        error ? (
          <FormHelp error>{t('versionsFailed', { error })}</FormHelp>
        ) : config.paperVersion && projectVersion && config.paperVersion !== projectVersion ? (
          <FormHelp>{t('versionMismatch', { version: projectVersion })}</FormHelp>
        ) : (
          <FormHelp>{t('versionHelp')}</FormHelp>
        )
      }
    >
      <div className="flex gap-1.5">
        <NativeSelect
          className="flex-1"
          value={config.paperVersion ?? ''}
          disabled={locked || options.length === 0}
          onChange={(e) => void testServer.setConfig({ paperVersion: e.target.value })}
        >
          {options.length === 0 && <NativeSelectOption value="">{error ? t('unavailable') : t('loadingVersions')}</NativeSelectOption>}
          {options.map((v) => (
            <NativeSelectOption key={v} value={v}>
              {v === projectVersion ? t('projectVersion', { version: v }) : v}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {error && (
          <Tip label={t('retry')}>
            <Button variant="outline" size="icon" aria-label={t('retry')} onClick={retry}>
              <RefreshCw />
            </Button>
          </Tip>
        )}
      </div>
    </FormField>
  );
}

function Setup({ config, locked }: { config: TestServerConfig; locked: boolean }) {
  const t = useTranslations('media.testServer.setup');
  const testServer = useTestServer();
  const { busy, run } = useAction();
  const { draft: name, setDraft: setName } = useDraft(
    config.playerName,
    (text) => ({ value: text }),
    (value) => value,
  );

  return (
    <Card size="sm" className="gap-0 py-0">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="font-heading">{t('title')}</CardTitle>
        <CardDescription className="text-xs">{locked ? t('lockedDescription') : t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">
        <FormGrid className="grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t('nexoPlugin')}</span>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={config.nexoJar ? 'success' : 'warning'}>
                {config.nexoJar ? `${config.nexoJar.name} ${config.nexoJar.version}` : t('notSelected')}
              </StatusBadge>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const jar = await testServer.chooseNexoJar();
                    if (jar) toast('success', t('jarSelected', { version: jar.version }));
                  })
                }
              >
                <Upload /> {t('chooseJar')}
              </Button>
            </div>
            <FormHelp>{t('jarHelp')}</FormHelp>
          </div>
          <VersionSelect config={config} locked={locked} />
          <FormField label={t('playerName')} description={<FormHelp>{t('playerHelp')}</FormHelp>}>
            <Input
              value={name}
              placeholder={t('playerPlaceholder')}
              maxLength={16}
              onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))}
              onBlur={() => {
                if (name !== config.playerName) void testServer.setConfig({ playerName: name });
              }}
            />
          </FormField>
          <FormField label={t('ram')} description={<FormHelp>{t('ramHelp')}</FormHelp>}>
            <NativeSelect
              className="w-full"
              value={config.ramGb}
              disabled={locked}
              onChange={(e) => void testServer.setConfig({ ramGb: Number(e.target.value) })}
            >
              {RAM_OPTIONS.map((gb) => (
                <NativeSelectOption key={gb} value={gb}>
                  {t('ramOption', { gb })}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label={t('port')} description={<FormHelp>{t('portHelp', { packPort: config.packPort })}</FormHelp>}>
            <Input
              className="font-mono"
              type="number"
              min={1024}
              max={65535}
              value={config.port}
              disabled={locked}
              onChange={(e) => void testServer.setConfig({ port: Number(e.target.value) })}
            />
          </FormField>
        </FormGrid>
        <CheckRow
          checked={config.eulaAccepted}
          onChange={(checked) => void testServer.setConfig({ eulaAccepted: checked })}
          label={t.rich('eula', {
            link: (chunks) => (
              <a
                href="https://aka.ms/MinecraftEULA"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
          description={t('eulaHint')}
        />
      </CardContent>
    </Card>
  );
}

const PACK_TONE: Record<PackState, Tone> = {
  idle: 'neutral',
  building: 'busy',
  ready: 'success',
  failed: 'error',
};

/** What Nexo is currently doing with the resource pack (from the server output) */
function PackStatus({ pack, player }: { pack: TestServerState['pack']; player: string }) {
  const t = useTranslations('media.testServer.pack');
  const testServer = useTestServer();
  const { busy, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-border px-4 py-3">
      <StatusBadge tone={PACK_TONE[pack.status]}>
        {pack.status === 'building' && <Spinner />}
        {t(pack.status)}
      </StatusBadge>
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={pack.message ?? ''}>
        {pack.status === 'failed' || pack.status === 'ready' ? pack.message : ''}
      </span>
      <Tip label={t('reloadHint')}>
        <Button variant="outline" size="sm" disabled={busy || pack.status === 'building'} onClick={() => void run(testServer.reload)}>
          <RefreshCw /> {t('reload')}
        </Button>
      </Tip>
      <Tip label={player ? t('resendHint', { player }) : t('enterName')}>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || pack.status !== 'ready' || !player}
          onClick={() => void run(() => testServer.command(`nexo pack ${player}`))}
        >
          <Upload /> {t('resend')}
        </Button>
      </Tip>
    </div>
  );
}

function SyncCard({ server }: { server: TestServerState }) {
  const t = useTranslations('media.testServer.sync');
  const format = useFormatter();
  const testServer = useTestServer();
  const errorMessage = useErrorMessage();
  const plan = usePlan();
  const { syncing, lastResult, lastCheck, syncError } = useTestServerStore();
  const time = (at: number) => format.dateTime(new Date(at), { timeStyle: 'medium' });
  const counts = plan ? countIssues(plan.issues) : null;
  const running = server.status === 'running';
  return (
    <Card size="sm" className="gap-0 py-0">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="font-heading">{t('title')}</CardTitle>
        <CardDescription className="text-xs">{t('description')}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" disabled={!running || syncing} onClick={() => void testServer.sync(true)}>
            {syncing ? <Spinner /> : <RefreshCw />} {t('now')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 py-4">
        <CheckRow
          checked={server.config.autoUpdate}
          onChange={(checked) => void testServer.setConfig({ autoUpdate: checked })}
          label={t('auto')}
          description={t('autoHint')}
        />
        <div className="text-xs text-muted-foreground">
          {syncError
            ? null
            : [
                lastResult
                  ? t('last', {
                      time: time(lastResult.at),
                      written: lastResult.written,
                      deleted: lastResult.deleted,
                      reloaded: String(!!lastResult.reloaded),
                    })
                  : running
                    ? null
                    : t('onStart'),
                lastCheck && (!lastResult || lastCheck > lastResult.at) ? t('upToDate', { time: time(lastCheck) }) : null,
              ]
                .filter(Boolean)
                .join(' ')}
          {lastResult?.skipped ? ` ${t('skipped', { count: lastResult.skipped })}` : ''}
        </div>
        {syncError !== null && (
          <Hint warning>
            <TriangleAlert className="size-4" />
            <span>{t('failed', { error: errorMessage(syncError) })}</span>
          </Hint>
        )}
        {counts && counts.error > 0 && (
          <Hint warning>
            <TriangleAlert className="size-4" />
            <span>{t('projectErrors', { count: counts.error })}</span>
          </Hint>
        )}
      </CardContent>
    </Card>
  );
}

export function TestServerView() {
  const t = useTranslations('media.testServer');
  if (useServices().testServer === null) {
    return (
      <PageShell>
        <Hint warning>
          <TriangleAlert className="size-4" />
          <span>{t('desktopOnly')}</span>
        </Hint>
      </PageShell>
    );
  }
  return <TestServerPage />;
}

function TestServerPage() {
  const t = useTranslations('media.testServer');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const testServer = useTestServer();
  const state = useTestServerStore((s) => s.server);
  const { busy, run } = useAction();
  const working = state ? ['preparing', 'starting', 'stopping'].includes(state.status) : false;
  const running = state?.status === 'running';
  const locked = !!state && state.status !== 'stopped' && state.status !== 'error';
  const uptime = state?.startedAt ? format.dateTime(new Date(state.startedAt), { timeStyle: 'medium' }) : null;

  if (!state) {
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

  const missing = !state.config.eulaAccepted ? t('missingEula') : !state.config.paperVersion ? t('missingVersion') : null;

  return (
    <PageShell>
      <PageHeader
        icon={<Server className="size-7 text-primary" />}
        title={t('title')}
        meta={
          <>
            <StatusBadge tone={STATUS_TONE[state.status]}>
              {working && <Spinner />}
              {t(`status.${state.status}`)}
            </StatusBadge>
            {state.installed && (
              <Badge variant="outline" className="font-mono">
                {t('installed', { paper: state.installed.paperVersion, java: state.installed.javaVersion })}
              </Badge>
            )}
            {running && uptime && <Badge variant="secondary">{t('since', { time: uptime })}</Badge>}
          </>
        }
        actions={
          running || working ? (
            <>
              <Button variant="outline" disabled={busy || working} onClick={() => void run(testServer.restart)}>
                <RotateCcw /> {t('restart')}
              </Button>
              <Button
                variant="destructive"
                disabled={busy || state.status === 'stopping' || state.status === 'preparing'}
                onClick={() => void run(testServer.stop)}
              >
                <Square /> {t('stop')}
              </Button>
            </>
          ) : (
            <Tip label={missing ?? undefined}>
              <Button size="lg" disabled={busy || !!missing} onClick={() => void run(testServer.start)}>
                <Play /> {t('start')}
              </Button>
            </Tip>
          )
        }
      />

      {/* state.message comes from the desktop process, which already writes it in the app's language */}
      {state.message && (
        <Hint warning={state.status === 'error'}>
          {working && <Spinner />}
          <span>{state.message}</span>
          {state.progress !== null && <Progress className="flex-1 self-center" value={state.progress} />}
        </Hint>
      )}
      {!state.config.nexoJar && (
        <Hint warning>
          <TriangleAlert className="size-4" />
          <span>{t('noNexo')}</span>
        </Hint>
      )}

      <Card size="sm" className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-3.5 px-4 py-3">
          <Plug className="size-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">
              {t.rich('connect', {
                version: state.config.paperVersion ?? '',
                address: state.address,
                mono: (chunks) => <span className="font-mono">{chunks}</span>,
              })}
            </div>
            <div className="text-xs text-muted-foreground">{t('connectHint')}</div>
          </div>
          <CopyButton text={state.address} />
          <Tip label={t('openFolder')}>
            <Button variant="outline" size="sm" onClick={testServer.openFolder}>
              <FolderOpen /> {t('folder')}
            </Button>
          </Tip>
        </div>
        {running && state.config.nexoJar && <PackStatus pack={state.pack} player={state.config.playerName} />}
      </Card>

      <SyncCard server={state} />
      <Console />
      <Setup config={state.config} locked={locked} />
    </PageShell>
  );
}
