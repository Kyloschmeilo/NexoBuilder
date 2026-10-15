import type { Project } from '@resourcepackbuilder/core/project/types';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { useOpenProject } from '../store/project';

/** Indentation per level; non-breaking, since option texts collapse ordinary spaces. */
const INDENT = '\u00a0'.repeat(3);

/** All folders in tree order with their depth (each folder once, even in a broken tree with a cycle). */
function flattenFolders(project: Project): Array<{ id: string; label: string; depth: number }> {
  const result: Array<{ id: string; label: string; depth: number }> = [];
  const seen = new Set<string>();
  const visit = (id: string, depth: number) => {
    const folder = project.folders[id];
    if (!folder || seen.has(id)) return;
    seen.add(id);
    result.push({ id, label: folder.name, depth });
    folder.folderIds.forEach((child) => visit(child, depth + 1));
  };
  project.rootFolderIds.forEach((id) => visit(id, 0));
  return result;
}

/** Native select of all folders of the open project, indented by depth. */
export function FolderSelect({ id, value, onChange }: { id?: string; value: string; onChange: (folderId: string) => void }) {
  const project = useOpenProject();
  return (
    <NativeSelect id={id} className="w-full" value={value} onChange={(e) => onChange(e.target.value)}>
      {flattenFolders(project).map((f) => (
        <NativeSelectOption key={f.id} value={f.id}>
          {INDENT.repeat(f.depth)}
          {f.depth > 0 ? '└ ' : ''}
          {f.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
