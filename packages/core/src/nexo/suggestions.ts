/**
 * The suggestions a Nexo project adds to its editors, by the fields' `dynamicSuggestions` name: the Carpentry block
 * types when the project has the addon, its dialogs' keys for the dialog links, and its multipack template ids.
 */
import { plainOptions, type Option } from '../form/options';
import { dialogKey } from '../project/media/dialog';
import type { Project } from '../project/types';
import { CARPENTRY_BLOCK_TYPE_OPTIONS } from './form/options';
import { multipackTemplateIds } from './multipack';

export function nexoProjectSuggestions(project: Pick<Project, 'settings' | 'dialogs'>): Record<string, Option[]> {
  return {
    carpentryBlockTypes: project.settings.carpentryAddon ? CARPENTRY_BLOCK_TYPE_OPTIONS : [],
    dialogs: plainOptions((project.dialogs ?? []).map((dialog) => dialogKey(dialog.dialogId))),
    multipackTemplates: plainOptions(multipackTemplateIds(project)),
  };
}
