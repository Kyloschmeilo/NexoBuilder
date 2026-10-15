/**
 * The export plan of the open project (validation, file list, YAML preview), computed once for the whole UI.
 * It is deferred, so typing stays responsive while the plan of a large project is recomputed.
 */
import { createContext, useContext, useDeferredValue, useMemo, type ReactNode } from 'react';
import { planExport } from '@resourcepackbuilder/core/export/plan';
import type { ExportPlan } from '@resourcepackbuilder/core/export/types';
import { useProjectStore } from './project';

const PlanContext = createContext<ExportPlan | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const project = useProjectStore((s) => s.project);
  const deferred = useDeferredValue(project);
  const plan = useMemo(() => (deferred ? planExport(deferred, { includeBinaries: false }) : null), [deferred]);
  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
}

/** The current plan; `null` while no project is open. */
export function usePlan(): ExportPlan | null {
  return useContext(PlanContext);
}
