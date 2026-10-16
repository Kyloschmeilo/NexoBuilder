import { useCallback, useEffect, useState } from 'react';
import { Package, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { IconButton } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@resourcepackbuilder/ui/components/item';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { richTags } from '../../i18n/richTags';
import { useServices } from '../../services/servicesContext';
import type { ProjectSummary } from '../../services/projectRepository';
import { confirm } from '../../store/dialogs';
import { useProjectStore } from '../../store/project';
import { useProjectActions } from './useProjectActions';

interface ProjectRowProps {
  project: ProjectSummary;
  isOpen: boolean;
  isShared: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

/** One saved project: the row opens it, the button beside it deletes it. */
function ProjectRow({ project, isOpen, isShared, onOpen, onDelete }: ProjectRowProps) {
  const t = useTranslations('layout.projectList');
  const format = useFormatter();
  return (
    <Item
      variant="outline"
      className="relative flex-nowrap bg-card py-2 pr-2 hover:border-input hover:bg-muted has-[button:focus-visible]:ring-3 has-[button:focus-visible]:ring-ring/50"
    >
      <ItemMedia variant="icon" className="text-muted-foreground">
        <Package className="size-4.5" />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="line-clamp-none flex-wrap gap-1.5 font-semibold break-words">
          {/* The whole row opens the project: the button's overlay covers it, the delete button sits above */}
          <button type="button" className="cursor-pointer text-left outline-none after:absolute after:inset-0" onClick={onOpen}>
            {project.name}
          </button>
          {isOpen && <Badge>{t('current')}</Badge>}
          {isShared && <Badge variant="success">{t('shared')}</Badge>}
        </ItemTitle>
        <ItemDescription className="text-xs">
          {t.rich('meta', {
            ...richTags,
            count: project.itemCount,
            namespace: project.namespace,
            date: format.dateTime(new Date(project.updatedAt), { dateStyle: 'medium', timeStyle: 'short' }),
          })}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="relative">
        <IconButton label={t('delete')} variant="ghost-destructive" onClick={onDelete}>
          <Trash2 />
        </IconButton>
      </ItemActions>
    </Item>
  );
}

/** The projects saved in this browser; `onOpened` runs after one was opened. */
export function ProjectList({ onOpened }: { onOpened?: () => void }) {
  const t = useTranslations('layout.projectList');
  const tCommon = useTranslations('common');
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  const openId = useProjectStore((s) => s.project?.id);
  const { repository } = useServices();
  const actions = useProjectActions();

  const refresh = useCallback(() => {
    void repository.list().then(setProjects, () => setProjects([]));
    void repository.sharedProjectIds().then(setSharedIds, () => undefined);
  }, [repository]);
  useEffect(refresh, [refresh]);

  if (!repository.available) return <p className="text-xs text-muted-foreground">{t('storageUnavailable')}</p>;
  if (!projects) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner /> {tCommon('loading')}
      </p>
    );
  }
  if (projects.length === 0) return <p className="text-xs text-muted-foreground">{t('empty')}</p>;

  const open = async (id: string) => {
    await actions.open(id);
    onOpened?.();
  };
  const remove = async (project: ProjectSummary) => {
    const confirmed = await confirm({
      title: t('deleteTitle'),
      message: t('deleteMessage', { name: project.name }),
      confirmLabel: t('deleteConfirm'),
      destructive: true,
    });
    if (!confirmed) return;
    await actions.remove(project.id);
    refresh();
  };

  return (
    <div className="flex flex-col gap-1.5">
      {projects.map((project) => (
        <ProjectRow
          key={project.id}
          project={project}
          isOpen={project.id === openId}
          isShared={sharedIds.has(project.id)}
          onOpen={() => void open(project.id)}
          onDelete={() => void remove(project)}
        />
      ))}
    </div>
  );
}
