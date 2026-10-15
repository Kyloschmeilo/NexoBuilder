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

export const DIALOGS: { [K in FeatureDialogId]: ComponentType<FeatureDialogProps[K]> } = {
  newItem: NewItemDialog,
  export: ExportDialog,
  settings: SettingsDialog,
  projects: ProjectsDialog,
  moveItem: MoveItemDialog,
  share: ShareDialog,
  pasteConfig: PasteConfigDialog,
};
