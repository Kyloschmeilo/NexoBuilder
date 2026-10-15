import { useCallback, useEffect, useState } from 'react';
import { Package, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { IconButton } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
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
    <div className="flex items-center gap-1 rounded-md border border-border bg-card pr-2 transition-colors hover:border-input hover:bg-muted">
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={onOpen}
      >
        <Package className="size-4.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5 font-semibold break-words">
            {project.name}
            {isOpen && <Badge>{t('current')}</Badge>}
            {isShared && <Badge variant="success">{t('shared')}</Badge>}
          </span>
          <span className="block text-xs text-muted-foreground">
            {t.rich('meta', {
              ...richTags,
              count: project.itemCount,
              namespace: project.namespace,
              date: format.dateTime(new Date(project.updatedAt), { dateStyle: 'medium', timeStyle: 'short' }),
            })}
          </span>
        </span>
      </button>
      <IconButton label={t('delete')} tone="destructive" onClick={onDelete}>
        <Trash2 />
      </IconButton>
    </div>
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
