/** Every feature dialog the shell can open, by id. */
import type { ComponentType } from 'react';
import { ExportDialog } from '../features/export/ExportDialog';
import { MoveItemDialog } from '../features/moveItem/MoveItemDialog';
import { NewItemDialog } from '../features/newItem/NewItemDialog';
import { PasteConfigDialog } from '../features/pasteConfig/PasteConfigDialog';
import { ProjectsDialog } from '../features/projects/ProjectsDialog';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import { ShareDialog } from '../features/share/ShareDialog';
import { useDialogStore, type FeatureDialogId, type FeatureDialogProps, type OpenedFeatureDialog } from '../store/dialogs';
import { getProject } from '../store/project';

export interface DialogEntry<K extends FeatureDialogId> {
  component: ComponentType<FeatureDialogProps[K]>;
  /** Belongs to the project it was opened for: shown only while exactly that project is open */
  requiresProject: boolean;
}

export const DIALOGS: { [K in FeatureDialogId]: DialogEntry<K> } = {
  newItem: { component: NewItemDialog, requiresProject: true },
  export: { component: ExportDialog, requiresProject: true },
  settings: { component: SettingsDialog, requiresProject: true },
  projects: { component: ProjectsDialog, requiresProject: false },
  moveItem: { component: MoveItemDialog, requiresProject: true },
  share: { component: ShareDialog, requiresProject: true },
  pasteConfig: { component: PasteConfigDialog, requiresProject: true },
};

/** Whether `dialog` is shown while the project `projectId` is open (a project dialog never outlives its project). */
export function isDialogShown(dialog: OpenedFeatureDialog, projectId: string | null): boolean {
  return !DIALOGS[dialog.id].requiresProject || (dialog.projectId !== null && dialog.projectId === projectId);
}

/** Whether a question or a feature dialog is on screen (window-level drops then stay out of the way). */
export function isAnyDialogShown(): boolean {
  const { questions, feature } = useDialogStore.getState();
  return questions.length > 0 || (feature !== null && isDialogShown(feature, getProject()?.id ?? null));
}
