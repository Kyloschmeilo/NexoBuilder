/**
 * The output dock on the right: the YAML of the file the page writes (with its path) and the checks of the entry,
 * followed by the whole project's checks. Wide windows show it as a resizable column, narrow ones as an overlay.
 * What it shows comes from the output providers in `output.ts`.
 */
import { type RefObject, useEffect, useRef } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { packTargetFor } from '@resourcepackbuilder/export';
import { countIssues, type Issue } from '@resourcepackbuilder/utils';
import { IconButton, Tip } from '@resourcepackbuilder/ui';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@resourcepackbuilder/ui/components/collapsible';
import { Kbd } from '@resourcepackbuilder/ui/components/kbd';
import { ScrollArea } from '@resourcepackbuilder/ui/components/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@resourcepackbuilder/ui/components/tabs';
import { IssueList } from '../components/IssueList';
import { YamlCode } from '../components/YamlCode';
import { isOneOf } from '../lib/isOneOf';
import { useOpenProject } from '../store/project';
import { DOCK_WIDTH, type DockTab, selectTarget, setDockOpen, setDockTab, setDockWidth, useUiStore } from '../store/ui';
import type { Output } from './output';
import { usePlan } from './PlanProvider';
import { ResizeHandle } from './ResizeHandle';
import { isModalDialogOpen } from './useShortcuts';

const DOCK_TABS = ['yaml', 'checks'] as const satisfies readonly DockTab[];

/** The issue count shown on the Checks tab: errors, else warnings, else nothing. */
function ChecksCount({ issues }: { issues: Issue[] }) {
  const counts = countIssues(issues);
  const [count, tone] =
    counts.error > 0 ? [counts.error, 'bg-danger text-danger-contrast'] : [counts.warning, 'bg-warning text-warning-contrast'];
  if (count === 0) return null;
  return <span className={cn('rounded-full px-1.5 font-mono text-micro leading-4', tone)}>{count}</span>;
}

/** The YAML of the page's file, with the file's path above it. */
function YamlPane({ output }: { output: Output | null }) {
  const t = useTranslations('layout.dock');
  const project = useOpenProject();
  const { layout } = packTargetFor(project);
  const path = output?.file ? `${layout.pluginDir}/${output.file}` : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {path && (
        <Tip label={path}>
          <p className="truncate border-b border-line px-3 py-1.5 font-mono text-micro text-muted-foreground" tabIndex={0}>
            {path}
          </p>
        </Tip>
      )}
      <ScrollArea className="min-h-0 flex-1">
        {output?.text ? (
          // The code block brings its own copy button
          <YamlCode text={output.text} className="rounded-none border-0" />
        ) : (
          <p className="p-8 text-center text-meta text-muted-foreground">{output ? t('emptyFile') : t('noFile')}</p>
        )}
      </ScrollArea>
    </div>
  );
}

/** The entry's checks, then the whole project's checks (collapsed). */
function ChecksPane({ output }: { output: Output | null }) {
  const t = useTranslations('layout.dock');
  const plan = usePlan();
  const all = plan?.issues ?? [];
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 p-3">
        {output && (
          <section className="flex flex-col gap-2">
            <h3 className="text-meta font-semibold text-muted-foreground">{t('entryChecks')}</h3>
            <IssueList issues={output.issues} onOpen={selectTarget} empty={t('entryChecksEmpty')} />
          </section>
        )}
        <Collapsible defaultOpen={!output} className="flex flex-col gap-2">
          <CollapsibleTrigger className="group/project flex items-center gap-1 rounded-sm text-left text-meta font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight className="size-3.5 transition-transform group-data-panel-open/project:rotate-90" />
            {t('projectChecks', { count: all.filter((issue) => issue.level !== 'info').length })}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <IssueList issues={all} onOpen={selectTarget} empty={t('projectChecksEmpty')} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}

interface OutputDockProps {
  output: Output | null;
  /** Column of the layout (wide windows) or overlay over the page (narrow windows) */
  isColumn: boolean;
}

/**
 * Keyboard behaviour of the overlay dock (narrow windows) while `isOverlay`: focus moves into the dock when it opens
 * and back to where it was (the toggle, a field) when it closes, and Escape closes it from anywhere, unless something
 * else already handled the key or a modal dialog is open over it.
 */
export function useOverlayFocus(dock: RefObject<HTMLElement | null>, isOverlay: boolean): void {
  useEffect(() => {
    const element = dock.current;
    if (!isOverlay || !element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!element.contains(document.activeElement)) element.focus({ preventScroll: true });
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !isModalDialogOpen()) {
        e.preventDefault();
        setDockOpen(false, false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      // Give the focus back only when it was in the dock (or got lost with it), never steal it from elsewhere
      const active = document.activeElement;
      const isLost = !active || active === document.body || element.contains(active);
      if (isLost && previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [dock, isOverlay]);
}

/** The dock with its YAML and Checks tabs, a close button and a resize handle on its left edge. */
export function OutputDock({ output, isColumn }: OutputDockProps) {
  const t = useTranslations('layout.dock');
  const dockTab = useUiStore((s) => s.dockTab);
  const width = useUiStore((s) => s.dockWidth);
  const dock = useRef<HTMLElement>(null);
  useOverlayFocus(dock, !isColumn);

  return (
    <aside
      ref={dock}
      aria-label={t('label')}
      tabIndex={isColumn ? undefined : -1}
      style={{ width }}
      className={cn(
        'flex min-h-0 max-w-full shrink-0 flex-col border-l border-line bg-surface outline-none',
        isColumn ? 'relative' : 'absolute inset-y-0 right-0 z-30 shadow-(--shadow-overlay)',
      )}
    >
      <Tabs
        value={dockTab}
        onValueChange={(value) => {
          if (isOneOf(DOCK_TABS, value)) setDockTab(value);
        }}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line pr-1.5 pl-2">
          <TabsList className="h-7!">
            <TabsTrigger value="yaml" className="px-2.5">
              {t('yamlTab')}
            </TabsTrigger>
            <TabsTrigger value="checks" className="px-2.5">
              {t('checksTab')}
              <ChecksCount issues={output?.issues ?? []} />
            </TabsTrigger>
          </TabsList>
          <span className="flex-1" />
          <IconButton
            label={
              <>
                {t('hide')} <Kbd>{t('toggleShortcut')}</Kbd>
              </>
            }
            aria-label={t('hide')}
            onClick={() => setDockOpen(false, isColumn)}
          >
            <X />
          </IconButton>
        </div>
        <TabsContent value="yaml" className="flex min-h-0 flex-col">
          <YamlPane output={output} />
        </TabsContent>
        <TabsContent value="checks" className="flex min-h-0 flex-col">
          <ChecksPane output={output} />
        </TabsContent>
      </Tabs>
      <ResizeHandle edge="left" width={width} range={DOCK_WIDTH} onResize={setDockWidth} label={t('resize')} />
    </aside>
  );
}
