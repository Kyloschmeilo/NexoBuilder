import type { Project } from '../../core/types';
import { useStore } from '../../state/store';

/** Alle Ordner als eingerückte Liste (für Auswahlfelder). */
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

export function FolderSelect({ value, onChange }: { value: string; onChange: (folderId: string) => void }) {
  const project = useStore((s) => s.project);
  if (!project) return null;
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {flattenFolders(project).map((f) => (
        <option key={f.id} value={f.id}>
          {'   '.repeat(f.depth)}
          {f.depth > 0 ? '└ ' : ''}
          {f.label}
        </option>
      ))}
    </select>
  );
}
