/** Every feature dialog the shell can open, by id. */
import type { ComponentType } from 'react';
import { ExportDialog } from '../features/export/ExportDialog';
import { MoveItemDialog } from '../features/moveItem/MoveItemDialog';
import { NewItemDialog } from '../features/newItem/NewItemDialog';
import { PasteConfigDialog } from '../features/pasteConfig/PasteConfigDialog';
import { ProjectsDialog } from '../features/projects/ProjectsDialog';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import { ShareDialog } from '../features/share/ShareDialog';
import type { FeatureDialogId, FeatureDialogProps } from '../store/dialogs';

export interface DialogEntry<K extends FeatureDialogId> {
  component: ComponentType<FeatureDialogProps[K]>;
  /** Rendered only while a project is open */
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
