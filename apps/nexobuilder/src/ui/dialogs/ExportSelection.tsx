/** Auswahl im Export-Dialog: welche Projekte und darin welche Ordner, Items und Glyphen exportiert werden. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Folder as FolderIcon, Frame, LoaderCircle, Music, Smile } from 'lucide-react';
import type { Project } from '@nexobuilder/core/types';
import {
  countSelected,
  itemIdsInFolder,
  selectionState,
  setItemsSelected,
  setListSelected,
  type ListSelectionKey,
  SELECT_ALL,
  type ExportSelection,
} from '@nexobuilder/core/export/selection';
import type { ProjectSummary } from '../../state/persistence';
import { itemLabel } from '../layout/Sidebar';

type CheckState = 'all' | 'none' | 'some';

/** Checkbox mit Zwischenzustand („teilweise ausgewählt“) */
function Check({ state, onChange, label }: { state: CheckState; onChange: (checked: boolean) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'some';
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="check"
      aria-label={label}
      checked={state === 'all'}
      onChange={() => onChange(state !== 'all')}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

interface TreeProps {
  project: Project;
  selection: ExportSelection;
  onChange: (selection: ExportSelection) => void;
  /** Glyphen nicht anzeigen (z.B. bei der Auswahl von Ziel-Items) */
  itemsOnly?: boolean;
}

/** Ordner, Items und Glyphen eines Projekts zum An- und Abwählen */
export function SelectionTree({ project, selection, onChange, itemsOnly }: TreeProps) {
  const itemCount = Object.keys(project.items).length;
  const [open, setOpen] = useState<Set<string>>(() => new Set(itemCount <= 40 ? Object.keys(project.folders) : project.rootFolderIds));
  const glyphs = project.glyphs ?? [];

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderFolder = (folderId: string, depth: number, guard: Set<string>) => {
    const folder = project.folders[folderId];
    if (!folder || guard.has(folderId)) return null;
    guard.add(folderId);
    const ids = itemIdsInFolder(project, folderId);
    if (ids.length === 0) return null;
    const state = selectionState(ids, selection.excludedItemIds);
    const isOpen = open.has(folderId);
    const excluded = new Set(selection.excludedItemIds);
    return (
      <div key={folderId}>
        <div className="select-row" style={{ paddingLeft: 4 + depth * 16 }} onClick={() => toggleOpen(folderId)}>
          <span className="tree-chevron">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
          <Check state={state} label={`Ordner ${folder.name}`} onChange={(checked) => onChange(setItemsSelected(selection, ids, checked))} />
          <FolderIcon size={15} className="faint" />
          <span className="select-label">{folder.name}</span>
          <span className="select-count mono">
            {ids.filter((id) => !excluded.has(id)).length}/{ids.length}
          </span>
        </div>
        {isOpen && (
          <>
            {folder.folderIds.map((child) => renderFolder(child, depth + 1, guard))}
            {folder.itemIds.map((itemId) => {
              const item = project.items[itemId];
              if (!item) return null;
              const checked = !excluded.has(itemId);
              return (
                <label key={itemId} className="select-row" style={{ paddingLeft: 24 + (depth + 1) * 16 }}>
                  <input
                    type="checkbox"
                    className="check"
                    checked={checked}
                    onChange={() => onChange(setItemsSelected(selection, [itemId], !checked))}
                  />
                  <span className="select-label">{itemLabel(item)}</span>
                  <span className="select-count mono">{item.nexoId}</span>
                </label>
              );
            })}
          </>
        )}
      </div>
    );
  };

  const guard = new Set<string>();
  const lists: Array<{ key: ListSelectionKey; open: string; label: string; icon: ReactNode; entries: Array<{ id: string; label: string }> }> = itemsOnly
    ? []
    : [
        {
          key: 'excludedGlyphIds',
          open: '$glyphs',
          label: 'Glyphs',
          icon: <Smile size={15} className="faint" />,
          entries: glyphs.map((g) => ({ id: g.id, label: `<glyph:${g.glyphId}>` })),
        },
        {
          key: 'excludedSoundIds',
          open: '$sounds',
          label: 'Sounds',
          icon: <Music size={15} className="faint" />,
          entries: (project.sounds ?? []).map((s) => ({ id: s.id, label: s.soundId })),
        },
        {
          key: 'excludedPaintingIds',
          open: '$paintings',
          label: 'Paintings',
          icon: <Frame size={15} className="faint" />,
          entries: (project.paintings ?? []).map((p) => ({ id: p.id, label: p.paintingId })),
        },
      ];
  const isEmpty = itemCount === 0 && lists.every((l) => l.entries.length === 0);

  return (
    <div className="select-tree">
      {project.rootFolderIds.map((id) => renderFolder(id, 0, guard))}
      {lists
        .filter((list) => list.entries.length > 0)
        .map((list) => {
          const ids = list.entries.map((e) => e.id);
          const excluded = new Set(selection[list.key] ?? []);
          const isOpen = open.has(list.open);
          return (
            <div key={list.key}>
              <div className="select-row" style={{ paddingLeft: 4 }} onClick={() => toggleOpen(list.open)}>
                <span className="tree-chevron">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                <Check
                  state={selectionState(ids, selection[list.key] ?? [])}
                  label={list.label}
                  onChange={(checked) => onChange(setListSelected(selection, list.key, ids, checked))}
                />
                {list.icon}
                <span className="select-label">{list.label}</span>
                <span className="select-count mono">
                  {ids.filter((id) => !excluded.has(id)).length}/{ids.length}
                </span>
              </div>
              {isOpen &&
                list.entries.map((entry) => {
                  const checked = !excluded.has(entry.id);
                  return (
                    <label key={entry.id} className="select-row" style={{ paddingLeft: 40 }}>
                      <input
                        type="checkbox"
                        className="check"
                        checked={checked}
                        onChange={() => onChange(setListSelected(selection, list.key, [entry.id], !checked))}
                      />
                      <span className="select-label mono">{entry.label}</span>
                    </label>
                  );
                })}
            </div>
          );
        })}
      {isEmpty && <div className="faint small" style={{ padding: '6px 8px' }}>{itemsOnly ? 'Keine Items.' : 'Das Projekt ist leer.'}</div>}
    </div>
  );
}

export interface ProjectChoice {
  summary: ProjectSummary;
  /** geladenes Projekt (null = wird noch geladen) */
  project: Project | null;
  current: boolean;
}

interface ProjectPickerProps {
  choices: ProjectChoice[];
  included: Set<string>;
  selections: Record<string, ExportSelection>;
  expanded: string | null;
  onToggleProject: (id: string, include: boolean) => void;
  onExpand: (id: string | null) => void;
  onSelectionChange: (id: string, selection: ExportSelection) => void;
}

/** Liste aller gespeicherten Projekte; das aufgeklappte zeigt seinen Ordnerbaum. */
export function ProjectPicker({ choices, included, selections, expanded, onToggleProject, onExpand, onSelectionChange }: ProjectPickerProps) {
  return (
    <div className="project-picker">
      {choices.map(({ summary, project, current }) => {
        const isIncluded = included.has(summary.id);
        const isExpanded = expanded === summary.id && isIncluded;
        const selection = selections[summary.id] ?? SELECT_ALL;
        const counts = project ? countSelected(project, selection) : null;
        const total = project ? Object.keys(project.items).length : summary.itemCount;
        return (
          <div key={summary.id} className={`picker-project ${isIncluded ? 'active' : ''}`}>
            <div className="select-row picker-head" onClick={() => isIncluded && onExpand(isExpanded ? null : summary.id)}>
              <span className="tree-chevron">{isIncluded ? isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}</span>
              <input
                type="checkbox"
                className="check"
                aria-label={`Projekt ${summary.name}`}
                checked={isIncluded}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleProject(summary.id, !isIncluded)}
              />
              <span className="select-label picker-name">{summary.name}</span>
              {current && <span className="pill">geöffnet</span>}
              <span className="select-count mono">
                {isIncluded && !project ? (
                  <LoaderCircle size={13} className="spin" />
                ) : isIncluded && counts ? (
                  `${counts.items}/${total} Items${counts.glyphs ? ` · ${counts.glyphs} Glyphs` : ''}${counts.sounds ? ` · ${counts.sounds} Sounds` : ''}${
                    counts.paintings ? ` · ${counts.paintings} Paintings` : ''
                  }`
                ) : (
                  `${total} Items`
                )}
              </span>
            </div>
            {isExpanded && project && (
              <SelectionTree project={project} selection={selection} onChange={(next) => onSelectionChange(summary.id, next)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
