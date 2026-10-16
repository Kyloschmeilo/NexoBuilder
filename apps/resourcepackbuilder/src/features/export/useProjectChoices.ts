import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { summarizeProject, type ProjectSummary } from '@resourcepackbuilder/core/project/summary';
import { useServices } from '../../services/bootstrap';

/** A project the export dialog offers. */
export interface ProjectChoice {
  summary: ProjectSummary;
  /** The loaded project; null until it is checked and loaded */
  project: Project | null;
  isOpen: boolean;
}

/**
 * The open project followed by the other saved projects. Other projects are loaded once they are checked – each at
 * most once per dialog opening (the loads are kept by id); one that cannot be loaded is reported via `onLoadFailed`.
 */
export function useProjectChoices(openProject: Project, includedIds: ReadonlySet<string>, onLoadFailed: (projectId: string) => void) {
  const { repository } = useServices();
  const [others, setOthers] = useState<ProjectSummary[]>([]);
  const [loads] = useState(() => new Map<string, Promise<Project | null>>());
  const [loaded, setLoaded] = useState<Record<string, Project>>({});
  const reportFailure = useEffectEvent(onLoadFailed);

  useEffect(() => {
    let isCurrent = true;
    repository.list().then(
      (list) => {
        if (isCurrent) setOthers(list.filter((p) => p.id !== openProject.id));
      },
      (err: unknown) => console.warn('Could not list the saved projects', err),
    );
    return () => {
      isCurrent = false;
    };
  }, [openProject.id, repository]);

  useEffect(() => {
    let isCurrent = true;
    for (const { id } of others) {
      if (!includedIds.has(id)) continue;
      let load = loads.get(id);
      if (!load) {
        load = repository.load(id).catch(() => null);
        loads.set(id, load);
      }
      void load.then((project) => {
        if (!isCurrent) return;
        if (project) {
          setLoaded((prev) => (prev[id] === project ? prev : { ...prev, [id]: project }));
        } else {
          loads.delete(id); // checking it again tries again
          reportFailure(id);
        }
      });
    }
    return () => {
      isCurrent = false;
    };
  }, [others, includedIds, loads, repository]);

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
