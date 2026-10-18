/**
 * The project-wide views of the registry panels: the media lists (glyphs, sounds, paintings; a Nexo project's
 * dialogs and multipack templates) and a CraftEngine
 * project's own lists (loot sources, templates, global variables, attributes, and every later project-level
 * registry). Each list is data; the Media and Logic panels (`panels/`) list them with their entries.
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
  Layers,
  LayoutGrid,
  LayoutTemplate,
  MessageSquare,
  Music,
  Package,
  Smile,
  Trees,
} from 'lucide-react';
import { projectAttributeData } from '@resourcepackbuilder/core/craftEngine';
import { multipackTemplateIds } from '@resourcepackbuilder/core/nexo';
import type { PackTargetId, Project } from '@resourcepackbuilder/core/project';
import type { IssueTarget } from '@resourcepackbuilder/utils';
import type { ViewName } from '../../store/ui';

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
export function isOffered(entry: ResourceView, target: PackTargetId): boolean {
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

/** Whether projects of `target` have the project-wide view `view` (dialogs and multipack are Nexo only). */
export function isViewOffered(view: ViewName, target: PackTargetId): boolean {
  const entry: ResourceView | undefined = RESOURCES.find((resource) => resource.view === view);
  return !entry || isOffered(entry, target);
}

/** The views of the media lists, in panel order. */
export const MEDIA_VIEW_NAMES: readonly ViewName[] = RESOURCES.map((entry) => entry.view);

/** The views of a CraftEngine project's own lists, in panel order. */
export const CRAFT_ENGINE_VIEW_NAMES: readonly ViewName[] = CRAFT_ENGINE_VIEWS.map((entry) => entry.view);
