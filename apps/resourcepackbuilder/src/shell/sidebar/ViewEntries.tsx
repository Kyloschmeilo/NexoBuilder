/** The entries below the tree that open project-wide views: glyphs, sounds, paintings and the test server. */
import type { ReactNode } from 'react';
import { Frame, Music, Server, Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import type { IssueTarget } from '@resourcepackbuilder/utils';
import { StatusDot, Tip, treeRow, treeRowSlots } from '@resourcepackbuilder/ui';
import { TEST_SERVER_STATUS_TONE } from '../../features/testServer/status';
import { usePlan } from '../PlanProvider';
import { useOpenProject } from '../../store/project';
import { useTestServerStore } from '../../services/testServerStore';
import { select, useUiStore, type ViewName } from '../../store/ui';
import { levelsByTarget, worstLevel } from './treeIndex';

interface ViewEntryProps {
  view: ViewName;
  icon: ReactNode;
  label: string;
  tip: string;
  /** Status dot and short text on the right */
  status: ReactNode;
}

function ViewEntry({ view, icon, label, tip, status }: ViewEntryProps) {
  const isSelected = useUiStore((s) => s.selection?.kind === 'view' && s.selection.view === view);
  return (
    <div className={treeRow({ selected: isSelected })} data-selected={isSelected || undefined}>
      <Tip label={tip} side="right">
        <button type="button" className={cn(treeRowSlots.button, 'pl-2')} onClick={() => select({ kind: 'view', view })}>
          <span className={treeRowSlots.icon}>{icon}</span>
          <span className={treeRowSlots.label}>{label}</span>
          {status}
        </button>
      </Tip>
    </div>
  );
}

/** The resource lists and the issue target kind of their entries */
const RESOURCES = [
  { view: 'glyphs', target: 'glyph', icon: <Smile className="size-4" /> },
  { view: 'sounds', target: 'sound', icon: <Music className="size-4" /> },
  { view: 'paintings', target: 'painting', icon: <Frame className="size-4" /> },
] as const satisfies ReadonlyArray<{ view: ViewName; target: IssueTarget['kind']; icon: ReactNode }>;

/** Project-wide lists below the tree, each with its size and the worst issue level of its entries. */
export function ResourceEntries() {
  const t = useTranslations('layout.sidebar.resources');
  const project = useOpenProject();
  const plan = usePlan();
  const sizes = { glyphs: project.glyphs.length, sounds: project.sounds.length, paintings: project.paintings.length };
  return (
    <div className="border-t border-sidebar-border px-1.5 pt-1.5 pb-2">
      {RESOURCES.map(({ view, target, icon }) => {
        const level = plan ? worstLevel(levelsByTarget(plan.issues, target).values()) : null;
        return (
          <ViewEntry
            key={view}
            view={view}
            icon={icon}
            label={t(`${view}.label`)}
            tip={t(`${view}.hint`)}
            status={
              <>
                {level && <StatusDot tone={level} />}
                <span className={treeRowSlots.count}>{sizes[view]}</span>
              </>
            }
          />
        );
      })}
    </div>
  );
}

/** Entry of the local test server with its status (desktop program only). */
export function TestServerEntry() {
  const t = useTranslations('layout.sidebar.testServer');
  const tStatus = useTranslations('media.testServer.status');
  const status = useTestServerStore((s) => s.server?.status ?? 'stopped');
  return (
    <div className="px-1.5 pb-2">
      <ViewEntry
        view="testServer"
        icon={<Server className="size-4 text-primary" />}
        label={t('label')}
        tip={t('hint')}
        status={
          <>
            {status !== 'stopped' && <StatusDot tone={TEST_SERVER_STATUS_TONE[status]} />}
            <span className={treeRowSlots.count}>{tStatus(status)}</span>
          </>
        }
      />
    </div>
  );
}
