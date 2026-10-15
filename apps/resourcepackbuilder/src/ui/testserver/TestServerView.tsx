import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { FolderOpen, Play, Plug, RefreshCw, RotateCcw, Server, Square, Trash2, TriangleAlert, Upload } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { cn } from 'cn';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { countIssues } from '@resourcepackbuilder/core/export/plan';
import { compareVersions } from '@resourcepackbuilder/core/util';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@resourcepackbuilder/ui/components/empty';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { Progress } from '@resourcepackbuilder/ui/components/progress';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@resourcepackbuilder/ui/components/tooltip';
import { CopyButton } from '@resourcepackbuilder/ui';
import { errorMessage } from '../../i18n/errors';
import type { TestServerConfig, TestServerStatus } from '../../state/desktop';
import { useStore } from '../../state/store';
import {
  chooseNexoJar,
  clearTestServerLog,
  isTestServerAvailable,
  loadPaperVersions,
  openTestServerFolder,
  reloadNexo,
  restartTestServer,
  sendTestServerCommand,
  setTestServerConfig,
  startTestServer,
  stopTestServer,
  syncProject,
  useTestServerStore,
} from '../../state/testserver';
import { CheckRow, FieldGrid, FormField, FormHelp, Hint, ViewHeader, ViewShell } from '../media/layout';

type Tone = '' | 'busy' | 'success' | 'danger';

/**
 * Visual tone per server status. The label is translated from `media.testServer.status.<status>`,
 * e.g. `useTranslations('media.testServer.status')(status)`.
 */
export const TEST_SERVER_STATUS: Record<TestServerStatus, { tone: Tone }> = {
  stopped: { tone: '' },
  preparing: { tone: 'busy' },
  starting: { tone: 'busy' },
  running: { tone: 'success' },
  stopping: { tone: 'busy' },
  error: { tone: 'danger' },
};

const TONE_BADGE: Record<Tone | 'warning', string> = {
  '': 'bg-secondary text-secondary-foreground',
  busy: 'bg-info/15 text-info',
  success: 'bg-success/15 text-success',
  danger: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  warning: 'bg-warning/15 text-warning',
};

function ToneBadge({ tone, children, className }: { tone: Tone | 'warning'; children: ReactNode; className?: string }) {
  return <Badge className={cn(TONE_BADGE[tone], className)}>{children}</Badge>;
}

/** Button with an explanatory tooltip (kept as hover text even while disabled). */
function HintButton({ hint, children, ...props }: ComponentProps<typeof Button> & { hint?: string }) {
  if (!hint) return <Button {...props}>{children}</Button>;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <Button {...props}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

const RAM_OPTIONS = [1, 2, 3, 4, 6, 8];

function useAction() {
  const toast = useStore((s) => s.toast);
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
  const log = useTestServerStore((s) => s.log);
  const status = useTestServerStore((s) => s.state?.status);
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
    void sendTestServerCommand(text);
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
          <HintButton variant="ghost" size="sm" hint={t('clearHint')} onClick={() => void clearTestServerLog()}>
            <Trash2 /> {t('clear')}
          </HintButton>
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
  const projectVersion = useStore((s) => s.project?.settings.minecraftVersion ?? '');
  const [versions, setVersions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setError(null);
    loadPaperVersions()
      .then((list) => setVersions([...list].sort((a, b) => compareVersions(b, a))))
      .catch((err: unknown) => setError(errorMessage(err)));
  };
  useEffect(load, []);

  // Default: the project version – if there is no Paper for it (yet), the newest
  useEffect(() => {
    if (!versions?.length || config.paperVersion) return;
    void setTestServerConfig({ paperVersion: versions.includes(projectVersion) ? projectVersion : versions[0] });
  }, [versions, config.paperVersion, projectVersion]);

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
          onChange={(e) => void setTestServerConfig({ paperVersion: e.target.value })}
        >
          {options.length === 0 && <NativeSelectOption value="">{error ? t('unavailable') : t('loadingVersions')}</NativeSelectOption>}
          {options.map((v) => (
            <NativeSelectOption key={v} value={v}>
              {v === projectVersion ? t('projectVersion', { version: v }) : v}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {error && (
          <HintButton variant="outline" size="icon" hint={t('retry')} aria-label={t('retry')} onClick={load}>
            <RefreshCw />
          </HintButton>
        )}
      </div>
    </FormField>
  );
}

function Setup({ config, locked }: { config: TestServerConfig; locked: boolean }) {
  const t = useTranslations('media.testServer.setup');
  const { busy, run } = useAction();
  const [name, setName] = useState(config.playerName);
  useEffect(() => setName(config.playerName), [config.playerName]);

  return (
    <Card size="sm" className="gap-0 py-0">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="font-heading">{t('title')}</CardTitle>
        <CardDescription className="text-xs">{locked ? t('lockedDescription') : t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">
        <FieldGrid className="grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t('nexoPlugin')}</span>
            <div className="flex flex-wrap items-center gap-2">
              <ToneBadge tone={config.nexoJar ? 'success' : 'warning'}>
                {config.nexoJar ? `${config.nexoJar.name} ${config.nexoJar.version}` : t('notSelected')}
              </ToneBadge>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const jar = await chooseNexoJar();
                    if (jar) useStore.getState().toast('success', t('jarSelected', { version: jar.version }));
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
              onBlur={() => name !== config.playerName && void setTestServerConfig({ playerName: name })}
            />
          </FormField>
          <FormField label={t('ram')} description={<FormHelp>{t('ramHelp')}</FormHelp>}>
            <NativeSelect
              className="w-full"
              value={config.ramGb}
              disabled={locked}
              onChange={(e) => void setTestServerConfig({ ramGb: Number(e.target.value) })}
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
              onChange={(e) => void setTestServerConfig({ port: Number(e.target.value) })}
            />
          </FormField>
        </FieldGrid>
        <CheckRow
          checked={config.eulaAccepted}
          onChange={(checked) => void setTestServerConfig({ eulaAccepted: checked })}
          label={t.rich('eula', {
            link: (chunks) => (
              <a href="https://aka.ms/MinecraftEULA" target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
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

const PACK_TONE: Record<'idle' | 'building' | 'ready' | 'failed', Tone> = {
  idle: '',
  building: 'busy',
  ready: 'success',
  failed: 'danger',
};

/** What Nexo is currently doing with the resource pack (from the server output) */
function PackStatus() {
  const t = useTranslations('media.testServer.pack');
  const state = useTestServerStore((s) => s.state)!;
  const { busy, run } = useAction();
  const pack = state.pack ?? { status: 'idle', message: null, at: null };
  const player = state.config.playerName;
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-border px-4 py-3">
      <ToneBadge tone={PACK_TONE[pack.status]}>
        {pack.status === 'building' && <Spinner />}
        {t(pack.status)}
      </ToneBadge>
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={pack.message ?? ''}>
        {pack.status === 'failed' || pack.status === 'ready' ? pack.message : ''}
      </span>
      <HintButton variant="outline" size="sm" hint={t('reloadHint')} disabled={busy || pack.status === 'building'} onClick={() => void run(reloadNexo)}>
        <RefreshCw /> {t('reload')}
      </HintButton>
      <HintButton
        variant="outline"
        size="sm"
        hint={player ? t('resendHint', { player }) : t('enterName')}
        disabled={busy || pack.status !== 'ready' || !player}
        onClick={() => void run(() => sendTestServerCommand(`nexo pack ${player}`))}
      >
        <Upload /> {t('resend')}
      </HintButton>
    </div>
  );
}

function SyncCard({ plan }: { plan: ExportPlan | null }) {
  const t = useTranslations('media.testServer.sync');
  const format = useFormatter();
  const state = useTestServerStore((s) => s.state)!;
  const { syncing, lastResult, lastCheck, syncError } = useTestServerStore();
  const time = (at: number) => format.dateTime(new Date(at), { timeStyle: 'medium' });
  const counts = plan ? countIssues(plan.issues) : null;
  const running = state.status === 'running';
  return (
    <Card size="sm" className="gap-0 py-0">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="font-heading">{t('title')}</CardTitle>
        <CardDescription className="text-xs">{t('description')}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" disabled={!running || syncing} onClick={() => void syncProject(true)}>
            {syncing ? <Spinner /> : <RefreshCw />} {t('now')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 py-4">
        <CheckRow
          checked={state.config.autoUpdate}
          onChange={(checked) => void setTestServerConfig({ autoUpdate: checked })}
          label={t('auto')}
          description={t('autoHint')}
        />
        <div className="text-xs text-muted-foreground">
          {syncError
            ? null
            : [
                lastResult
                  ? t('last', { time: time(lastResult.at), written: lastResult.written, deleted: lastResult.deleted, reloaded: String(!!lastResult.reloaded) })
                  : running
                    ? null
                    : t('onStart'),
                lastCheck && (!lastResult || lastCheck > lastResult.at) ? t('upToDate', { time: time(lastCheck) }) : null,
              ]
                .filter(Boolean)
                .join(' ')}
          {lastResult?.skipped ? ` ${t('skipped', { count: lastResult.skipped })}` : ''}
        </div>
        {/* syncError is the caught error's text as the store keeps it */}
        {syncError && (
          <Hint warning>
            <TriangleAlert className="size-4" />
            <span>{t('failed', { error: syncError })}</span>
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

export function TestServerView({ plan }: { plan: ExportPlan | null }) {
  const t = useTranslations('media.testServer');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const state = useTestServerStore((s) => s.state);
  const { busy, run } = useAction();
  const status = state ? TEST_SERVER_STATUS[state.status] : null;
  const working = state ? ['preparing', 'starting', 'stopping'].includes(state.status) : false;
  const running = state?.status === 'running';
  const locked = !!state && state.status !== 'stopped' && state.status !== 'error';
  const uptime = state?.startedAt ? format.dateTime(new Date(state.startedAt), { timeStyle: 'medium' }) : null;

  if (!isTestServerAvailable()) {
    return (
      <ViewShell>
        <Hint warning>
          <TriangleAlert className="size-4" />
          <span>{t('desktopOnly')}</span>
        </Hint>
      </ViewShell>
    );
  }
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
    <ViewShell>
      <ViewHeader
        icon={<Server className="size-7" />}
        iconClassName="text-primary"
        title={t('title')}
        meta={
          <>
            {status && (
              <ToneBadge tone={status.tone}>
                {working && <Spinner />}
                {t(`status.${state.status}`)}
              </ToneBadge>
            )}
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
              <Button variant="outline" disabled={busy || working} onClick={() => void run(restartTestServer)}>
                <RotateCcw /> {t('restart')}
              </Button>
              <Button
                variant="destructive"
                disabled={busy || state.status === 'stopping' || state.status === 'preparing'}
                onClick={() => void run(stopTestServer)}
              >
                <Square /> {t('stop')}
              </Button>
            </>
          ) : (
            <HintButton size="lg" hint={missing ?? undefined} disabled={busy || !!missing} onClick={() => void run(startTestServer)}>
              <Play /> {t('start')}
            </HintButton>
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
          <HintButton variant="outline" size="sm" hint={t('openFolder')} onClick={openTestServerFolder}>
            <FolderOpen /> {t('folder')}
          </HintButton>
        </div>
        {running && state.config.nexoJar && <PackStatus />}
      </Card>

      <SyncCard plan={plan} />
      <Console />
      <Setup config={state.config} locked={locked} />
    </ViewShell>
  );
}
