import { useLayoutEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { Panel, Section, Tip } from '@resourcepackbuilder/ui';
import { consoleCommandText, isPlayerName, serverAdapterFor } from '@resourcepackbuilder/test-server';
import { packTargetFor } from '@resourcepackbuilder/export';
import { useProjectStore } from '../../store/project';
import type { TestServerLogLine } from '../../platform/desktopApi';
import { useTestServerStore } from '../../services/testServerStore';
import { useCommandHistory } from './useCommandHistory';
import { useTestServer } from './useTestServer';
import { useErrorMessage } from '../../i18n/errors';
import { notify } from '../../shell/notify';

/** Distance from the bottom (px) within which the output keeps following new lines. */
const FOLLOW_THRESHOLD_PX = 40;

const LINE_COLOR: Record<TestServerLogLine['kind'], string> = {
  out: 'text-muted-foreground',
  err: 'text-destructive',
  info: 'text-info',
};

/** Example commands for the command line: giving the open project's first item to the player, in the plugin's syntax. */
function useCommandExample(): string {
  const t = useTranslations('media.testServer.console');
  const project = useProjectStore((s) => s.project);
  const playerName = useTestServerStore((s) => s.server?.config.playerName ?? '');
  const player = isPlayerName(playerName) ? playerName : 'Steve';
  const item = project ? Object.values(project.items)[0] : undefined;
  if (!project || !item) return t('placeholderNoItems', { player });
  try {
    const give = serverAdapterFor(project.target).giveCommand(packTargetFor(project).yamlKey(project, item), 1, player);
    return t('placeholder', { give, player });
  } catch {
    // An item id that is no valid command argument yet (still being typed)
    return t('placeholderNoItems', { player });
  }
}

/** Server output and command line. */
export function ServerConsole() {
  const t = useTranslations('media.testServer.console');
  const testServer = useTestServer();
  const log = useTestServerStore((s) => s.log);
  const isRunning = useTestServerStore((s) => s.server?.status === 'running');
  const { command, setCommand, commit, older, newer } = useCommandHistory();
  const placeholder = useCommandExample();
  const errorMessage = useErrorMessage();
  const output = useRef<HTMLDivElement>(null);
  const isFollowing = useRef(true);

  useLayoutEffect(() => {
    if (output.current && isFollowing.current) output.current.scrollTop = output.current.scrollHeight;
  }, [log]);

  const send = () => {
    const text = consoleCommandText(command);
    if (!text) return;
    testServer.command(text).catch((err: unknown) => notify('error', errorMessage(err)));
    commit(text);
  };

  return (
    <Section
      id="console"
      title={t('title')}
      description={t('description')}
      actions={
        <Tip label={t('clearHint')}>
          <Button variant="ghost" size="sm" onClick={() => void testServer.clearLog()}>
            <Trash2 /> {t('clear')}
          </Button>
        </Tip>
      }
    >
      <Panel className="overflow-hidden">
        <div
          ref={output}
          data-testid="test-server-console"
          className="h-84 overflow-auto border-b border-line bg-canvas px-4 py-3 font-mono text-xs leading-5"
          onScroll={(e) => {
            const el = e.currentTarget;
            isFollowing.current = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD_PX;
          }}
        >
          {log.length === 0 ? (
            <div className="text-muted-foreground">{t('empty')}</div>
          ) : (
            log.map((line) => (
              <div
                key={line.id}
                data-testid="console-line"
                data-level={line.kind}
                className={cn('break-words whitespace-pre-wrap', LINE_COLOR[line.kind])}
              >
                {line.line}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="font-mono text-muted-foreground" aria-hidden>
            &gt;
          </span>
          <Input
            data-testid="test-server-command"
            aria-label={t('commandLabel')}
            className="min-w-0 flex-1 font-mono"
            value={command}
            disabled={!isRunning}
            placeholder={isRunning ? placeholder : t('notRunning')}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
              else if (e.key === 'ArrowUp') older();
              else if (e.key === 'ArrowDown') newer();
              else return;
              e.preventDefault();
            }}
          />
          <Button variant="outline" size="sm" disabled={!isRunning || !command.trim()} onClick={send}>
            {t('send')}
          </Button>
        </div>
      </Panel>
    </Section>
  );
}
