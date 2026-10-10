import { useRef, useState } from 'react';
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Download,
  FolderOpen,
  FolderSync,
  FilePlus2,
  PanelRight,
  PanelRightClose,
  Redo2,
  Save,
  Settings,
  TriangleAlert,
  Undo2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type { ExportPlan } from '../../core/export/plan';
import { countIssues } from '../../core/export/plan';
import { useStore } from '../../state/store';
import { MenuItem, Popover } from '../common/Popover';
import { closeProject, openProjectFile, openSharedProjectFromFolder, saveProjectFile } from '../projectActions';
import { isShareAvailable, useShareStore } from '../../state/share';
import { SHARE_STATUS_TEXT, shareStatusClass } from '../dialogs/ShareDialog';

function ShareChip() {
  const projectId = useStore((s) => s.project?.id);
  const share = useShareStore();
  const shared = share.projectId === projectId && share.status !== 'off';
  return (
    <button
      className="btn ghost share-chip"
      title={shared ? `Geteilt über ${share.folder} – ${SHARE_STATUS_TEXT[share.status]}` : 'Projekt mit anderen teilen'}
      onClick={() => useStore.getState().openDialog({ type: 'share' })}
    >
      {shared ? (
        <>
          <span className={`share-dot ${shareStatusClass(share.status)}`} /> Geteilt
        </>
      ) : (
        <>
          <Users size={15} /> Teilen
        </>
      )}
    </button>
  );
}

export function TopBar({ plan }: { plan: ExportPlan | null }) {
  const project = useStore((s) => s.project);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const saveStatus = useStore((s) => s.saveStatus);
  const rightPanel = useStore((s) => s.rightPanel);
  const [menuOpen, setMenuOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const counts = plan ? countIssues(plan.issues) : null;
  const open = useStore.getState().openDialog;

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo">N</div>
        NexoBuilder
      </div>
      {project && (
        <>
          <button ref={anchor} className="btn ghost" onClick={() => setMenuOpen((o) => !o)} style={{ maxWidth: 280 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name || 'Unbenannt'}</span>
            <ChevronDown size={14} />
          </button>
          <Popover anchor={anchor.current} open={menuOpen} onClose={() => setMenuOpen(false)} width={260}>
            <MenuItem
              icon={<Settings size={15} />}
              label="Projekt-Einstellungen"
              description="Name, Namespace, Version, Pack-Icon"
              onClick={() => {
                setMenuOpen(false);
                open({ type: 'settings' });
              }}
            />
            <MenuItem
              icon={<Users size={15} />}
              label="Projekt teilen …"
              description="Mit anderen gemeinsam bearbeiten"
              onClick={() => {
                setMenuOpen(false);
                open({ type: 'share' });
              }}
            />
            <div className="menu-sep" />
            <MenuItem
              icon={<Save size={15} />}
              label="Projektdatei speichern"
              description="Sicherung / zum Weitergeben (.nexobuilder.json)"
              onClick={() => {
                setMenuOpen(false);
                saveProjectFile();
              }}
            />
            <MenuItem
              icon={<Upload size={15} />}
              label="Projektdatei öffnen"
              onClick={() => {
                setMenuOpen(false);
                void openProjectFile();
              }}
            />
            <MenuItem
              icon={<FolderOpen size={15} />}
              label="Projekte wechseln …"
              onClick={() => {
                setMenuOpen(false);
                open({ type: 'projects' });
              }}
            />
            {isShareAvailable() && (
              <MenuItem
                icon={<FolderSync size={15} />}
                label="Geteiltes Projekt öffnen …"
                onClick={() => {
                  setMenuOpen(false);
                  void openSharedProjectFromFolder();
                }}
              />
            )}
            <MenuItem
              icon={<FilePlus2 size={15} />}
              label="Neues Projekt"
              onClick={() => {
                setMenuOpen(false);
                open({ type: 'newProject' });
              }}
            />
            <div className="menu-sep" />
            <MenuItem
              icon={<X size={15} />}
              label="Projekt schließen"
              onClick={() => {
                setMenuOpen(false);
                void closeProject();
              }}
            />
          </Popover>
          <div className="row" style={{ gap: 2 }}>
            <button className="btn ghost icon" title="Rückgängig (Strg+Z)" disabled={!canUndo} onClick={() => useStore.getState().undo()}>
              <Undo2 size={16} />
            </button>
            <button className="btn ghost icon" title="Wiederholen (Strg+Y)" disabled={!canRedo} onClick={() => useStore.getState().redo()}>
              <Redo2 size={16} />
            </button>
          </div>
          <span className="faint small nowrap" title="Projekte werden automatisch im Browser gespeichert">
            {saveStatus === 'saving' ? 'Speichert …' : saveStatus === 'saved' ? 'Gespeichert' : saveStatus === 'error' ? 'Nicht gespeichert!' : ''}
          </span>
          <ShareChip />
        </>
      )}
      <span className="topbar-spacer" />
      {project && counts && (
        <button className="btn ghost" title="Prüfung anzeigen" onClick={() => open({ type: 'export' })}>
          {counts.error > 0 ? (
            <>
              <CircleAlert size={16} style={{ color: 'var(--danger)' }} /> {counts.error} Fehler
            </>
          ) : counts.warning > 0 ? (
            <>
              <TriangleAlert size={16} style={{ color: 'var(--warning)' }} /> {counts.warning} {counts.warning === 1 ? 'Warnung' : 'Warnungen'}
            </>
          ) : (
            <>
              <CircleCheck size={16} style={{ color: 'var(--success)' }} /> Alles ok
            </>
          )}
        </button>
      )}
      {project && (
        <>
          <button
            className="btn ghost icon"
            title={rightPanel ? 'Vorschau ausblenden' : 'Vorschau einblenden'}
            onClick={() => useStore.getState().setRightPanel(!rightPanel)}
          >
            {rightPanel ? <PanelRightClose size={17} /> : <PanelRight size={17} />}
          </button>
          <button className="btn primary" onClick={() => open({ type: 'export' })}>
            <Download size={16} /> Exportieren
          </button>
        </>
      )}
    </header>
  );
}
