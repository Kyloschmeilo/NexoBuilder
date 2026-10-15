import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, Download, FileArchive, FolderTree, Package, ScrollText } from 'lucide-react';
import type { Project } from '@nexobuilder/core/types';
import { countIssues, type ExportMode } from '@nexobuilder/core/export/plan';
import { planMultiExport, SELECT_ALL, type ExportEntry, type ExportSelection } from '@nexobuilder/core/export/selection';
import { buildMultiExportZip, listMultiExportPaths } from '@nexobuilder/core/export/zip';
import { getMcVersion } from '@nexobuilder/core/minecraft/versions';
import { updateProjectSettings } from '../../state/actions';
import { listProjects, loadProject, type ProjectSummary } from '../../state/persistence';
import { useStore } from '../../state/store';
import { IssueList } from '@nexobuilder/ui';
import { Modal } from '@nexobuilder/ui';
import { downloadBytes } from '@nexobuilder/ui';
import { ProjectPicker, type ProjectChoice } from './ExportSelection';

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
    desc: 'Das external pack als ZIP (pack.mcmeta + assets). Mehrere Projekte: ein Ordner pro Pack.',
    icon: <Package size={16} />,
  },
  {
    id: 'items',
    title: 'Nur Configs',
    desc: 'Nur die YAML-Dateien (items/, recipes/, glyphs/) ohne Resourcepack.',
    icon: <ScrollText size={16} />,
  },
];

/** Zuletzt gewählte Auswahl – bleibt erhalten, solange NexoBuilder offen ist */
const remembered: { included: string[] | null; selections: Record<string, ExportSelection> } = { included: null, selections: {} };

/** Erstellt das ZIP und startet den Download. */
async function runExport(entries: ExportEntry[], mode: ExportMode): Promise<boolean> {
  const { toast } = useStore.getState();
  if (entries.length === 0) return false;
  try {
    const multi = planMultiExport(entries, { includeBinaries: true });
    const result = await buildMultiExportZip(multi, mode);
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
  const deferredProject = useDeferredValue(project);
  const [mode, setMode] = useState<ExportMode>('full');
  const [busy, setBusy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Gespeicherte Projekte (das geöffnete steht immer oben)
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const [loaded, setLoaded] = useState<Record<string, Project>>({});
  // Das geöffnete Projekt ist beim Öffnen immer angehakt, weitere bleiben von vorher gemerkt
  const [included, setIncluded] = useState<Set<string>>(() => new Set([project.id, ...(remembered.included ?? [])]));
  const [selections, setSelections] = useState<Record<string, ExportSelection>>(() => ({ ...remembered.selections }));
  const [expanded, setExpanded] = useState<string | null>(project.id);

  useEffect(() => {
    void listProjects().then((list) => setSummaries(list.filter((p) => p.id !== project.id)));
  }, [project.id]);

  // Andere Projekte erst laden, wenn sie angehakt werden
  useEffect(() => {
    for (const id of included) {
      if (id === project.id || loaded[id]) continue;
      if (summaries.length > 0 && !summaries.some((s) => s.id === id)) continue;
      void loadProject(id).then((p) => {
        if (p) setLoaded((prev) => ({ ...prev, [id]: p }));
        else setIncluded((prev) => new Set([...prev].filter((x) => x !== id)));
      });
    }
  }, [included, loaded, project.id, summaries]);

  useEffect(() => {
    remembered.included = [...included];
    remembered.selections = selections;
  }, [included, selections]);

  const choices: ProjectChoice[] = useMemo(
    () => [
      {
        summary: { id: project.id, name: project.name, namespace: project.namespace, itemCount: Object.keys(project.items).length, updatedAt: project.updatedAt },
        project,
        current: true,
      },
      ...summaries.map((summary) => ({ summary, project: loaded[summary.id] ?? null, current: false })),
    ],
    [project, summaries, loaded],
  );

  const entriesFor = (current: Project): ExportEntry[] =>
    choices
      .filter((c) => included.has(c.summary.id))
      .map((c) => (c.current ? current : c.project))
      .filter((p): p is Project => p !== null)
      .map((p) => ({ project: p, selection: selections[p.id] }));

  const loading = choices.some((c) => included.has(c.summary.id) && !c.project);
  const multi = useMemo(() => planMultiExport(entriesFor(deferredProject), { includeBinaries: false }), [deferredProject, choices, included, selections]);

  const counts = countIssues(multi.issues);
  const paths = useMemo(() => listMultiExportPaths(multi, mode), [multi, mode]);
  const itemCount = multi.projects.reduce((n, p) => n + p.plan.items.length, 0);
  const glyphCount = multi.projects.reduce((n, p) => n + (p.project.glyphs?.length ?? 0), 0);
  const mediaCount = multi.projects.reduce((n, p) => n + (p.project.sounds?.length ?? 0) + (p.project.paintings?.length ?? 0), 0);
  const several = multi.projects.length > 1;
  const empty = itemCount + glyphCount + mediaCount === 0;

  const doExport = async () => {
    setBusy(true);
    const ok = await runExport(entriesFor(useStore.getState().project ?? project), mode);
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
        onConfirm: () => void runExport(entriesFor(useStore.getState().project ?? project), mode),
      });
      return;
    }
    void doExport();
  };

  const toggleProject = (id: string, include: boolean) => {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (include) next.add(id);
      else next.delete(id);
      return next;
    });
    if (include) setExpanded(id);
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
            <span className="mono">{itemCount}</span> Item(s)
            {glyphCount > 0 && (
              <>
                {' '}
                · <span className="mono">{glyphCount}</span> Glyph(en)
              </>
            )}
            {several ? (
              <>
                {' '}
                aus <span className="mono">{multi.projects.length}</span> Projekten
              </>
            ) : (
              multi.projects[0] && (
                <>
                  {' '}
                  · Namespace <span className="mono">{multi.projects[0].project.namespace}</span> · Minecraft{' '}
                  {getMcVersion(multi.projects[0].project.settings.minecraftVersion).label}
                </>
              )
            )}
          </span>
          <button className="btn" onClick={close}>
            Abbrechen
          </button>
          <button className="btn primary" disabled={busy || loading || empty} onClick={confirmAndExport}>
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

        <div className="export-grid">
          <div className="col" style={{ gap: 8 }}>
            <div className="row">
              <div className="label-caps">Auswahl</div>
              <span className="spacer" />
              <button
                className="btn ghost small"
                onClick={() => setSelections((prev) => ({ ...prev, [expanded ?? project.id]: SELECT_ALL }))}
                disabled={!expanded || !included.has(expanded)}
              >
                Alle
              </button>
              <button
                className="btn ghost small"
                disabled={!expanded || !included.has(expanded)}
                onClick={() => {
                  const target = choices.find((c) => c.summary.id === expanded)?.project;
                  if (!target) return;
                  setSelections((prev) => ({
                    ...prev,
                    [target.id]: {
                      excludedItemIds: Object.keys(target.items),
                      excludedGlyphIds: (target.glyphs ?? []).map((g) => g.id),
                      excludedSoundIds: (target.sounds ?? []).map((g) => g.id),
                      excludedPaintingIds: (target.paintings ?? []).map((g) => g.id),
                    },
                  }));
                }}
              >
                Keine
              </button>
            </div>
            <ProjectPicker
              choices={choices}
              included={included}
              selections={selections}
              expanded={expanded}
              onToggleProject={toggleProject}
              onExpand={setExpanded}
              onSelectionChange={(id, next) => setSelections((prev) => ({ ...prev, [id]: next }))}
            />
            {several && (
              <div className="field-help">
                Mehrere Projekte: Jedes Projekt bekommt einen eigenen Ordner unter items/ und einen eigenen Resourcepack. Andere Projekte
                verwenden ihre eigenen Export-Einstellungen.
              </div>
            )}
          </div>
          <div className="col" style={{ gap: 8 }}>
            <div className="label-caps">
              Inhalt · <span className="mono">{paths.length}</span> Dateien
            </div>
            <div className="file-list">
              {paths.map((p) => (
                <div key={p}>{p}</div>
              ))}
              {paths.length === 0 && <div className="faint">Nichts ausgewählt.</div>}
            </div>
          </div>
        </div>

        <details className="subsection">
          <summary>
            <ChevronRight size={14} className="chev" />
            Optionen für „{project.name}“
          </summary>
          <div className="subsection-body export-options">
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
                checked={project.settings.itemsInProjectFolder || several}
                disabled={mode === 'pack' || several}
                onChange={(e) => updateProjectSettings((p) => (p.settings.itemsInProjectFolder = e.target.checked))}
              />
              <span>
                Items in eigenen Projektordner
                <div className="tr-desc">{several ? 'Bei mehreren Projekten immer aktiv.' : 'items/<projekt>/… statt direkt items/…'}</div>
              </span>
            </label>
            <label className="field">
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
        </details>

        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="label-caps">Prüfung</div>
            {counts.error > 0 && <span className="badge danger">{counts.error} Fehler</span>}
            {counts.warning > 0 && <span className="badge warning">{counts.warning} {counts.warning === 1 ? 'Warnung' : 'Warnungen'}</span>}
            {counts.error === 0 && counts.warning === 0 && <span className="badge success">Alles in Ordnung</span>}
            <span className="spacer" />
            {counts.info > 0 && (
              <label className="row small faint" style={{ gap: 5, cursor: 'pointer' }}>
                <input type="checkbox" className="check" checked={showInfo} onChange={(e) => setShowInfo(e.target.checked)} /> {counts.info}{' '}
                {counts.info === 1 ? 'Hinweis' : 'Hinweise'} anzeigen
              </label>
            )}
          </div>
          <IssueList
            issues={multi.issues}
            hideInfo={!showInfo}
            empty="Keine Fehler oder Warnungen."
            canOpen={(issue) => !('projectId' in issue) || !issue.projectId || issue.projectId === project.id}
            onOpenItem={(itemId) => {
              close();
              select({ kind: 'item', id: itemId });
            }}
            onOpenGlyphs={() => {
              close();
              select({ kind: 'glyphs' });
            }}
          />
        </div>

        {mode === 'full' && (
          <div className="hint">
            Installation: ZIP in <code className="code-inline">plugins/Nexo/</code> entpacken, dann <code className="code-inline">/nexo reload all</code>{' '}
            ausführen. Eine Anleitung liegt als ANLEITUNG.txt bei.
          </div>
        )}
      </div>
    </Modal>
  );
}
