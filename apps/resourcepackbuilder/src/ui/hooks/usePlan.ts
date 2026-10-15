import { useDeferredValue, useMemo } from 'react';
import { planExport, type ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { useStore } from '../../state/store';

/** Live validation of the project (without binary data) – used for status, preview and export. */
export function usePlan(): ExportPlan | null {
  const project = useStore((s) => s.project);
  const deferred = useDeferredValue(project);
  return useMemo(() => (deferred ? planExport(deferred, { includeBinaries: false }) : null), [deferred]);
}
