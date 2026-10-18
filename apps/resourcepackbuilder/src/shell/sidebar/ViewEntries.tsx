/**
 * The project-wide views of the registry panels: the media lists (glyphs, sounds, paintings) and a CraftEngine
 * project's own lists (loot sources, templates, global variables, attributes, and every later project-level
 * registry). Each list is data; the Media and Logic activities show them as panels of entries in the sidebar.
 */
import type { ReactNode } from 'react';
import {
  Braces,
  Dumbbell,
  FileCode,
  Frame,
  Gem,
  Images,
  Languages,
  LayoutGrid,
  LayoutTemplate,
  Music,
  Package,
  Smile,
  Trees,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import { projectAttributeData } from '@resourcepackbuilder/core/craftEngine';
import type { Project } from '@resourcepackbuilder/core/project';
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

/** The resource lists and the issue target kind of their entries */
export const RESOURCES = [
  { view: 'glyphs', target: 'glyph', icon: <Smile className="size-4" /> },
  { view: 'sounds', target: 'sound', icon: <Music className="size-4" /> },
  { view: 'paintings', target: 'painting', icon: <Frame className="size-4" /> },
] as const satisfies ReadonlyArray<{ view: ViewName; target: IssueTarget['kind']; icon: ReactNode }>;

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
  {
    view: 'translations',
    icon: <Languages className="size-4" />,
    count: (p: Project) =>
      [p.craftEngine?.lang, p.craftEngine?.translations].reduce(
        (sum, texts) => sum + Object.values(texts ?? {}).reduce((keys, entries) => keys + Object.keys(entries).length, 0),
        0,
      ),
  },
  { view: 'categories', icon: <LayoutGrid className="size-4" />, count: (p: Project) => p.craftEngine?.categories?.length ?? 0 },
  {
    view: 'worldgen',
    icon: <Trees className="size-4" />,
    count: (p: Project) => (p.craftEngine?.configuredFeatures?.length ?? 0) + (p.craftEngine?.placedFeatures?.length ?? 0),
  },
  { view: 'atlases', icon: <Images className="size-4" />, count: (p: Project) => p.craftEngine?.atlases?.length ?? 0 },
  { view: 'pack', icon: <Package className="size-4" />, count: (p: Project) => p.craftEngine?.configFactories?.length ?? 0 },
  { view: 'scripts', icon: <FileCode className="size-4" />, count: (p: Project) => p.craftEngine?.scripts?.length ?? 0 },
] as const satisfies ReadonlyArray<{ view: ViewName; icon: ReactNode; count: (project: Project) => number }>;

/** The views of the media lists, in panel order. */
export const MEDIA_VIEW_NAMES: readonly ViewName[] = RESOURCES.map((entry) => entry.view);

/** The views of a CraftEngine project's own lists, in panel order. */
export const CRAFT_ENGINE_VIEW_NAMES: readonly ViewName[] = CRAFT_ENGINE_VIEWS.map((entry) => entry.view);

/** The entries of the media lists, each with its size and the worst issue level of its entries. */
export function MediaEntries() {
  const t = useTranslations('layout.sidebar.resources');
  const project = useOpenProject();
  const plan = usePlan();
  const sizes = { glyphs: project.glyphs.length, sounds: project.sounds.length, paintings: project.paintings.length };
  return RESOURCES.map(({ view, target, icon }) => {
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
