import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { summarizeProject, type ProjectSummary } from '@resourcepackbuilder/core/project/summary';
import { useServices } from '../../services/bootstrap';
import { setOtherProjectIncluded } from '../../store/exportChoices';

/** A project the export dialog offers. */
export interface ProjectChoice {
  summary: ProjectSummary;
  /** The loaded project; null until it is checked and loaded */
  project: Project | null;
  isOpen: boolean;
}

/**
 * The open project followed by the other saved projects. Other projects are only loaded once they are checked; one
 * that cannot be loaded is unchecked again.
 */
export function useProjectChoices(openProject: Project, includedIds: ReadonlySet<string>) {
  const { repository } = useServices();
  const [others, setOthers] = useState<ProjectSummary[]>([]);
  const [loaded, setLoaded] = useState<Record<string, Project>>({});
  const requested = useRef(new Set<string>());

  useEffect(() => {
    let isCurrent = true;
    void repository.list().then((list) => {
      if (isCurrent) setOthers(list.filter((p) => p.id !== openProject.id));
    });
    return () => {
      isCurrent = false;
    };
  }, [openProject.id, repository]);

  useEffect(() => {
    for (const { id } of others) {
      if (!includedIds.has(id) || requested.current.has(id)) continue;
      requested.current.add(id);
      repository
        .load(id)
        .catch(() => null)
        .then((project) => {
          if (project) {
            setLoaded((prev) => ({ ...prev, [id]: project }));
          } else {
            requested.current.delete(id);
            setOtherProjectIncluded(id, false);
          }
        });
    }
  }, [others, includedIds, repository]);

  const choices = useMemo(
    (): ProjectChoice[] => [
      { summary: summarizeProject(openProject), project: openProject, isOpen: true },
      ...others.map((summary) => ({ summary, project: loaded[summary.id] ?? null, isOpen: false })),
    ],
    [openProject, others, loaded],
  );
  const isLoading = choices.some((c) => includedIds.has(c.summary.id) && !c.project);
  return { choices, isLoading };
}
