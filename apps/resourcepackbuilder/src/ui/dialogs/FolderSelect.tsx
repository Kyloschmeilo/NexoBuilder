import type { Project } from '@resourcepackbuilder/core/types';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { useStore } from '../../state/store';

/** All folders as an indented list (for select fields). */
export function flattenFolders(project: Project): Array<{ id: string; label: string; depth: number }> {
  const result: Array<{ id: string; label: string; depth: number }> = [];
  const visit = (id: string, depth: number) => {
    const folder = project.folders[id];
    if (!folder) return;
    result.push({ id, label: folder.name, depth });
    folder.folderIds.forEach((child) => visit(child, depth + 1));
  };
  project.rootFolderIds.forEach((id) => visit(id, 0));
  return result;
}

export function FolderSelect({ id, value, onChange }: { id?: string; value: string; onChange: (folderId: string) => void }) {
  const project = useStore((s) => s.project);
  if (!project) return null;
  return (
    <NativeSelect id={id} className="w-full" value={value} onChange={(e) => onChange(e.target.value)}>
      {flattenFolders(project).map((f) => (
        <NativeSelectOption key={f.id} value={f.id}>
          {'   '.repeat(f.depth)}
          {f.depth > 0 ? '└ ' : ''}
          {f.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
