import { flattenFolderTree } from '@resourcepackbuilder/core/project';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { useOpenProject } from '../store/project';

/** Indentation per level; non-breaking, since option texts collapse ordinary spaces. */
const INDENT = '\u00a0'.repeat(3);

/** Native select of all folders of the open project, indented by depth. */
export function FolderSelect({ id, value, onChange }: { id?: string; value: string; onChange: (folderId: string) => void }) {
  const project = useOpenProject();
  return (
    <NativeSelect id={id} className="w-full" value={value} onChange={(e) => onChange(e.target.value)}>
      {flattenFolderTree(project).map(({ folder, depth }) => (
        <NativeSelectOption key={folder.id} value={folder.id}>
          {INDENT.repeat(depth)}
          {depth > 0 ? '└ ' : ''}
          {folder.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
