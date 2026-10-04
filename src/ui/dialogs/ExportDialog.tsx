import { useMemo, useState, type ReactNode } from 'react';
import { Download, FileArchive, FolderTree, Package, ScrollText } from 'lucide-react';
import { countIssues, planExport, type ExportMode } from '../../core/export/plan';
import { buildExportZip, listExportPaths } from '../../core/export/zip';
import { getMcVersion } from '../../core/minecraft/versions';
import { updateProjectSettings } from '../../state/actions';
import { useStore } from '../../state/store';
import { IssueList } from '../common/IssueList';
import { Modal } from '../common/Modal';
import { downloadBytes } from '../files';
import { usePlan } from '../hooks/usePlan';

const MODES: Array<{ id: ExportMode; title: string; desc: string; icon: ReactNode }> = [
  {
    id: 'full',
    title: 'Für den Nexo-Ordner',
    desc: 'items/ + pack/external_packs/ – einfach in plugins/Nexo entpacken.',
    icon: <FolderTree size={16} />,
  },
  {
    id: 'pack',
    title: 'Nur Resourcepack',
    desc: 'Das external pack als ZIP (pack.mcmeta + assets) – z.B. für Nexo/pack/external_packs.',
    icon: <Package size={16} />,
  },
  {
    id: 'items',
    title: 'Nur Item-Configs',
    desc: 'Nur die YAML-Dateien für plugins/Nexo/items.',
    icon: <ScrollText size={16} />,
  },
];

/** Erstellt das ZIP und startet den Download. */
async function runExport(mode: ExportMode): Promise<boolean> {
  const { project, toast } = useStore.getState();
  if (!project) return false;
  try {
    const full = planExport(project, { includeBinaries: true });
    const result = await buildExportZip(project, full, mode);
    downloadBytes(result.data, result.fileName, 'application/zip');
    toast('success', `${result.fileName} wurde erstellt (${result.paths.length} Dateien).`);
    return true;
  } catch (err) {
    console.error(err);
    toast('error', `Export fehlgeschlagen: ${(err as Error).message}`);
    return false;
  }
}

export function ExportDialog() {
  const project = useStore((s) => s.project)!;
  const close = useStore((s) => s.closeDialog);
  const select = useStore((s) => s.select);
  const plan = usePlan();
  const [mode, setMode] = useState<ExportMode>('full');
  const [busy, setBusy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const counts = plan ? countIssues(plan.issues) : { error: 0, warning: 0, info: 0 };
  const paths = useMemo(() => (plan ? listExportPaths(project, plan, mode) : []), [plan, project, mode]);
  const itemCount = Object.keys(project.items).length;

  const doExport = async () => {
    setBusy(true);
    const ok = await runExport(mode);
    setBusy(false);
    if (ok) close();
  };

  const confirmAndExport = () => {
    if (counts.error > 0) {
      useStore.getState().openDialog({
        type: 'confirm',
        title: 'Trotz Fehlern exportieren?',
        message: `Es gibt noch ${counts.error} Fehler. Betroffene Items oder Modelle funktionieren in Nexo/Minecraft wahrscheinlich nicht richtig.`,
        confirmLabel: 'Trotzdem exportieren',
        danger: true,
        onConfirm: () => void runExport(mode),
      });
      return;
    }
    void doExport();
  };

  return (
    <Modal
      title="Exportieren"
      icon={<FileArchive size={20} />}
      onClose={close}
      size="wide"
      footer={
        <>
          <span className="left">
            {itemCount} Item(s) · Namespace <span className="mono">{project.namespace}</span> · Minecraft{' '}
            {getMcVersion(project.settings.minecraftVersion).label}
          </span>
          <button className="btn" onClick={close}>
            Abbrechen
          </button>
          <button className="btn primary" disabled={busy || itemCount === 0} onClick={confirmAndExport}>
            <Download size={16} /> {busy ? 'Wird erstellt …' : 'ZIP herunterladen'}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 16 }}>
        <div className="radio-cards">
          {MODES.map((m) => (
            <div key={m.id} className={`radio-card ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)} role="radio" aria-checked={mode === m.id}>
              <span className="rc-title">
                {m.icon}
                {m.title}
              </span>
              <span className="rc-desc">{m.desc}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 16 }}>
          <div className="col" style={{ gap: 4 }}>
            <div className="field-label">Optionen</div>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={project.settings.externalPackAsZip}
                disabled={mode !== 'full'}
                onChange={(e) => updateProjectSettings((p) => (p.settings.externalPackAsZip = e.target.checked))}
              />
              <span>
                External pack als .zip
                <div className="tr-desc">Statt eines Ordners pack/external_packs/{project.settings.packName}/ eine ZIP-Datei.</div>
              </span>
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={project.settings.itemsInProjectFolder}
                disabled={mode === 'pack'}
                onChange={(e) => updateProjectSettings((p) => (p.settings.itemsInProjectFolder = e.target.checked))}
              />
              <span>
                Items in eigenen Projektordner
                <div className="tr-desc">items/{project.name ? '<projekt>' : ''}/… statt direkt items/…</div>
              </span>
            </label>
            <label className="field" style={{ marginTop: 6 }}>
              <span className="field-label">YAML-Dateien</span>
              <select
                className="select"
                value={project.settings.yamlFileMode}
                disabled={mode === 'pack'}
                onChange={(e) => updateProjectSettings((p) => (p.settings.yamlFileMode = e.target.value as 'folder' | 'item'))}
              >
                <option value="folder">Eine Datei pro Ordner (z.B. items/waffen/waffen.yml)</option>
                <option value="item">Eine Datei pro Item (z.B. items/waffen/ruby_sword.yml)</option>
              </select>
            </label>
          </div>
          <div className="col" style={{ gap: 6 }}>
            <div className="field-label">Inhalt ({paths.length} Dateien)</div>
            <div className="file-list">
              {paths.map((p) => (
                <div key={p}>{p}</div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="field-label">Prüfung</div>
            {counts.error > 0 && <span className="badge danger">{counts.error} Fehler</span>}
            {counts.warning > 0 && <span className="badge warning">{counts.warning} {counts.warning === 1 ? 'Warnung' : 'Warnungen'}</span>}
            {counts.error === 0 && counts.warning === 0 && <span className="badge success">Alles in Ordnung</span>}
            <span className="spacer" />
            {counts.info > 0 && (
              <label className="row small faint" style={{ gap: 5, cursor: 'pointer' }}>
                <input type="checkbox" checked={showInfo} onChange={(e) => setShowInfo(e.target.checked)} /> {counts.info}{' '}
                {counts.info === 1 ? 'Hinweis' : 'Hinweise'} anzeigen
              </label>
            )}
          </div>
          <IssueList
            issues={plan?.issues ?? []}
            hideInfo={!showInfo}
            empty="Keine Fehler oder Warnungen."
            onOpenItem={(itemId) => {
              close();
              select({ kind: 'item', id: itemId });
            }}
          />
        </div>

        {mode === 'full' && (
          <div className="hint">
            Installation: ZIP in <span className="mono">&nbsp;plugins/Nexo/&nbsp;</span> entpacken, dann <span className="mono">&nbsp;/nexo reload&nbsp;</span>{' '}
            ausführen. Eine Anleitung liegt als ANLEITUNG.txt bei.
          </div>
        )}
      </div>
    </Modal>
  );
}
