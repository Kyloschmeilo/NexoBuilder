/**
 * The JavaScript files of a CraftEngine project: each with its path in the pack's script folder and its source.
 * `js` functions and conditions call them by `<namespace>:<path>`. The export writes them to script/<path>.js.
 */
import { FileCode } from 'lucide-react';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { craftEnginePackDir } from '@resourcepackbuilder/export';
import { RegistryPage } from './RegistryPage';

export function ScriptsView() {
  return (
    <RegistryPage view="scripts" icon={FileCode} docs={CE_DOCS.scripts} file={(project) => `${craftEnginePackDir(project)}/script/`} />
  );
}
