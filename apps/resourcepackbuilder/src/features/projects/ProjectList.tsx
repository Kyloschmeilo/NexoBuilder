import { useEffect, useState } from 'react';
import { Package, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { IconButton } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { useServices } from '../../services/servicesContext';
import type { ProjectSummary } from '../../services/projectRepository';
import { confirm } from '../../store/dialogs';
import { useProjectStore } from '../../store/project';
import { useProjectActions } from './useProjectActions';

export function ProjectList({ onOpened }: { onOpened?: () => void }) {
  const t = useTranslations('layout.projectList');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());
  const currentId = useProjectStore((s) => s.project?.id);
  const { repository } = useServices();
  const actions = useProjectActions();
  const refresh = () => {
    void repository.list().then(setProjects, () => setProjects([]));
    void repository.sharedProjectIds().then(setSharedIds, () => undefined);
  };
  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps -- load once per mount
  if (!repository.available) {
    return <div className="text-xs text-muted-foreground">{t('storageUnavailable')}</div>;
  }
  if (!projects) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner /> {tCommon('loading')}
      </div>
    );
  }
  if (projects.length === 0) return <div className="text-xs text-muted-foreground">{t('empty')}</div>;
  return (
    <div className="flex flex-col gap-1.5">
      {projects.map((p) => {
        const open = async () => {
          await actions.open(p.id);
          onOpened?.();
        };
        const remove = async () => {
          const confirmed = await confirm({
            title: t('deleteTitle'),
            message: t('deleteMessage', { name: p.name }),
            confirmLabel: t('deleteConfirm'),
            destructive: true,
          });
          if (!confirmed) return;
          await actions.remove(p.id);
          refresh();
        };
        return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors outline-none hover:border-input hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => void open()}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                void open();
              }
            }}
          >
            <Package className="size-4.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                {p.name}
                {p.id === currentId && <Badge>{t('current')}</Badge>}
                {sharedIds.has(p.id) && <Badge className="bg-success/15 text-success">{t('shared')}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.rich('meta', {
                  count: p.itemCount,
                  namespace: p.namespace,
                  date: format.dateTime(new Date(p.updatedAt), { dateStyle: 'medium', timeStyle: 'short' }),
                  mono: (chunks) => <span className="font-mono">{chunks}</span>,
                })}
              </div>
            </div>
            <IconButton
              label={t('delete')}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                void remove();
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Trash2 />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
