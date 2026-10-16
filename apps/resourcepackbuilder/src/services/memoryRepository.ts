/** An in-memory {@link ProjectRepository} for tests: it records every save, and `control.failing` makes saves throw. */
import { summarizeProject } from '@resourcepackbuilder/core/project/summary';
import type { Project } from '@resourcepackbuilder/core/project/types';
import type { SyncState } from '@resourcepackbuilder/core/sync/engine';
import type { ProjectRepository, ShareConfig } from './projectRepository';

export function memoryRepository() {
  const projects = new Map<string, Project>();
  const shares = new Map<string, ShareConfig>();
  const syncStates = new Map<string, SyncState>();
  /** Every saved project, in order */
  const saved: Project[] = [];
  const control = { failing: false };
  let lastId: string | null = null;

  const repository: ProjectRepository = {
    available: true,
    list: async () => [...projects.values()].map(summarizeProject).sort((a, b) => b.updatedAt - a.updatedAt),
    load: async (id) => projects.get(id) ?? null,
    async save(project, syncState) {
      if (control.failing) throw new Error('disk full');
      saved.push(project);
      projects.set(project.id, project);
      if (syncState) syncStates.set(project.id, syncState);
      lastId = project.id;
    },
    async remove(id) {
      projects.delete(id);
      shares.delete(id);
      syncStates.delete(id);
      if (lastId === id) lastId = null;
    },
    lastProjectId: async () => lastId,
    async clearLastProjectId() {
      lastId = null;
    },
    loadShareConfig: async (id) => shares.get(id) ?? null,
    saveShareConfig: async (id, config) => void shares.set(id, config),
    async removeShare(id) {
      shares.delete(id);
      syncStates.delete(id);
    },
    sharedProjectIds: async () => new Set(shares.keys()),
    loadSyncState: async (id) => syncStates.get(id) ?? null,
    saveSyncState: async (id, state) => void syncStates.set(id, state),
    clientId: async () => 'c_test',
  };
  return { repository, projects, shares, syncStates, saved, control };
}
