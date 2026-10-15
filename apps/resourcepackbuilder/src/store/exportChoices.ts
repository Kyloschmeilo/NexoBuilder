/**
 * The last choices in the export dialog – which other projects are exported along and what is selected in each – kept
 * while the app runs, so reopening the dialog starts from them.
 */
import { create } from 'zustand';
import type { ExportSelection } from '@resourcepackbuilder/core/export/selection';

interface ExportChoicesState {
  /** Saved projects (besides the open one) checked for export */
  otherProjectIds: string[];
  /** Selection per project id; a project without one is exported completely */
  selections: Record<string, ExportSelection>;
}

export const useExportChoicesStore = create<ExportChoicesState>(() => ({ otherProjectIds: [], selections: {} }));

export function setOtherProjectIncluded(projectId: string, isIncluded: boolean): void {
  useExportChoicesStore.setState((s) => ({
    otherProjectIds: isIncluded
      ? [...s.otherProjectIds.filter((id) => id !== projectId), projectId]
      : s.otherProjectIds.filter((id) => id !== projectId),
  }));
}

export function setExportSelection(projectId: string, selection: ExportSelection): void {
  useExportChoicesStore.setState((s) => ({ selections: { ...s.selections, [projectId]: selection } }));
}
