/**
 * The project-wide views of the registry panels: the media lists (glyphs, sounds, paintings; a Nexo project's
 * dialogs and multipack templates) and a CraftEngine
 * project's own lists (loot sources, templates, global variables, attributes, and every later project-level
 * registry). Each list is data; the Media and Logic activities show them as panels of entries in the sidebar.
 */
import type { ReactNode } from 'react';
import { Braces, Dumbbell, Frame, Gem, Layers, LayoutTemplate, MessageSquare, Music, Smile } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { projectAttributeData } from '@resourcepackbuilder/core/craftEngine';
import { multipackTemplateIds } from '@resourcepackbuilder/core/nexo';
import type { PackTargetId, Project } from '@resourcepackbuilder/core/project';
import type { IssueTarget } from '@resourcepackbuilder/utils';
import { StatusDot, Tip, treeRow, treeRowSlots } from '@resourcepackbuilder/ui';
import { usePlan } from '../PlanProvider';
import { useOpenProject } from '../../store/project';
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
        <button
          type="button"
          aria-current={isSelected ? 'page' : undefined}
          className={cn(treeRowSlots.button, 'pl-2')}
          onClick={() => select({ kind: 'view', view })}
        >
          <span className={treeRowSlots.icon}>{icon}</span>
          <span className={treeRowSlots.label}>{label}</span>
          {status}
        </button>
      </Tip>
    </div>
  );
}

/** A resource list: its size, the issue target kind of its entries (for the status dot) and the targets that have it. */
interface ResourceView {
  view: ViewName;
  icon: ReactNode;
  count: (project: Project) => number;
  target?: IssueTarget['kind'];
  /** The pack targets whose projects have this list; every target when absent */
  targets?: readonly PackTargetId[];
}

/** The resource lists, in panel order */
export const RESOURCES = [
  { view: 'glyphs', target: 'glyph', icon: <Smile className="size-4" />, count: (p: Project) => p.glyphs.length },
  { view: 'sounds', target: 'sound', icon: <Music className="size-4" />, count: (p: Project) => p.sounds.length },
  { view: 'paintings', target: 'painting', icon: <Frame className="size-4" />, count: (p: Project) => p.paintings.length },
  {
    view: 'dialogs',
    target: 'dialog',
    icon: <MessageSquare className="size-4" />,
    count: (p: Project) => p.dialogs.length,
    targets: ['nexo'],
  },
  { view: 'multipack', icon: <Layers className="size-4" />, count: (p: Project) => multipackTemplateIds(p).length, targets: ['nexo'] },
] as const satisfies ReadonlyArray<ResourceView>;

/** Whether projects of `target` have the resource list `entry`. */
function isOffered(entry: ResourceView, target: PackTargetId): boolean {
  return !entry.targets || entry.targets.includes(target);
}

/** A CraftEngine project's own lists and the size of each */
export const CRAFT_ENGINE_VIEWS = [
  { view: 'lootSources', icon: <Gem className="size-4" />, count: (p: Project) => p.craftEngine?.lootSources?.length ?? 0 },
  { view: 'templates', icon: <LayoutTemplate className="size-4" />, count: (p: Project) => p.craftEngine?.templates?.length ?? 0 },
  {
    view: 'globalVariables',
    icon: <Braces className="size-4" />,
    count: (p: Project) => Object.keys(p.craftEngine?.globalVariables ?? {}).length,
  },
  {
    view: 'attributes',
    icon: <Dumbbell className="size-4" />,
    count: (p: Project) => Object.values(projectAttributeData(p)).reduce((sum, list) => sum + (list?.length ?? 0), 0),
  },
] as const satisfies ReadonlyArray<{ view: ViewName; icon: ReactNode; count: (project: Project) => number }>;

/** Whether projects of `target` have the project-wide view `view` (dialogs and multipack are Nexo only). */
export function isViewOffered(view: ViewName, target: PackTargetId): boolean {
  const entry: ResourceView | undefined = RESOURCES.find((resource) => resource.view === view);
  return !entry || isOffered(entry, target);
}

/** The views of the media lists, in panel order. */
export const MEDIA_VIEW_NAMES: readonly ViewName[] = RESOURCES.map((entry) => entry.view);

/** The views of a CraftEngine project's own lists, in panel order. */
export const CRAFT_ENGINE_VIEW_NAMES: readonly ViewName[] = CRAFT_ENGINE_VIEWS.map((entry) => entry.view);

/** The entries of the media lists the project's target has, each with its size and the worst issue level of its entries. */
export function MediaEntries() {
  const t = useTranslations('layout.sidebar.resources');
  const project = useOpenProject();
  const plan = usePlan();
  return RESOURCES.filter((entry) => isOffered(entry, project.target)).map((entry) => {
    const { view, icon, count } = entry;
    const target: ResourceView['target'] = 'target' in entry ? entry.target : undefined;
    const level = plan && target ? worstLevel(levelsByTarget(plan.issues, target).values()) : null;
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
            <span className={treeRowSlots.count}>{count(project)}</span>
          </>
        }
      />
    );
  });
}

/** The entries of a CraftEngine project's own lists, each with its size. */
export function CraftEngineEntries() {
  const t = useTranslations('layout.sidebar.resources');
  const project = useOpenProject();
  return CRAFT_ENGINE_VIEWS.map(({ view, icon, count }) => (
    <ViewEntry
      key={view}
      view={view}
      icon={icon}
      label={t(`${view}.label`)}
      tip={t(`${view}.hint`)}
      status={<span className={treeRowSlots.count}>{count(project)}</span>}
    />
  ));
}
