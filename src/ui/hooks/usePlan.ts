import { useDeferredValue, useMemo } from 'react';
import { planExport, type ExportPlan } from '../../core/export/plan';
import { useStore } from '../../state/store';

/** Live-Prüfung des Projekts (ohne Binärdaten) – wird für Status, Vorschau und Export genutzt. */
export function usePlan(): ExportPlan | null {
  const project = useStore((s) => s.project);
  const deferred = useDeferredValue(project);
  return useMemo(() => (deferred ? planExport(deferred, { includeBinaries: false }) : null), [deferred]);
}
