import { useLayoutEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { SectionCard, Tip } from '@resourcepackbuilder/ui';
import type { TestServerLogLine } from '../../platform/desktopApi';
import { useTestServerStore } from '../../store/testServer';
import { useCommandHistory } from './useCommandHistory';
import { useTestServer } from './useTestServer';

/** Distance from the bottom (px) within which the output keeps following new lines. */
const FOLLOW_THRESHOLD_PX = 40;

const LINE_COLOR: Record<TestServerLogLine['kind'], string> = {
  out: 'text-muted-foreground',
  err: 'text-destructive',
  info: 'text-info',
};

/** Server output and command line. */
export function ServerConsole() {
  const t = useTranslations('media.testServer.console');
  const testServer = useTestServer();
  const log = useTestServerStore((s) => s.log);
  const isRunning = useTestServerStore((s) => s.server?.status === 'running');
  const { command, setCommand, commit, older, newer } = useCommandHistory();
  const output = useRef<HTMLDivElement>(null);
  const isFollowing = useRef(true);

  useLayoutEffect(() => {
    if (output.current && isFollowing.current) output.current.scrollTop = output.current.scrollHeight;
  }, [log]);

  const send = () => {
    const text = command.trim().replace(/^\//, '');
    if (!text) return;
    void testServer.command(text);
    commit(text);
  };

  return (
    <SectionCard
      size="sm"
      title={t('title')}
      description={t('description')}
      actions={
        <Tip label={t('clearHint')}>
          <Button variant="ghost" size="sm" onClick={() => void testServer.clearLog()}>
            <Trash2 /> {t('clear')}
          </Button>
        </Tip>
      }
      contentClassName="p-0"
    >
      <div
        ref={output}
        data-testid="test-server-console"
        className="h-84 overflow-auto border-b border-border bg-background px-4 py-3 font-mono text-xs leading-5"
        onScroll={(e) => {
          const el = e.currentTarget;
          isFollowing.current = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD_PX;
        }}
      >
        {log.length === 0 ? (
          <div className="text-muted-foreground">{t('empty')}</div>
        ) : (
          log.map((line, index) => (
            <div
              key={index}
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
          placeholder={isRunning ? t('placeholder') : t('notRunning')}
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
    </SectionCard>
  );
}
