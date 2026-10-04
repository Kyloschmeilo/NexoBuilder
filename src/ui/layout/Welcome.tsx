import { useEffect, useState } from 'react';
import { FolderOpen, FolderPlus, Package, Trash2, Upload } from 'lucide-react';
import { DEFAULT_MC_VERSION, MC_VERSIONS } from '../../core/minecraft/versions';
import { NAMESPACE_PATTERN, slugify } from '../../core/util';
import { isStorageAvailable, listProjects, type ProjectSummary } from '../../state/persistence';
import { useStore } from '../../state/store';
import { Modal } from '../common/Modal';
import { openProjectFile, openStoredProject, removeStoredProject, startNewProject } from '../projectActions';

export function NewProjectForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [nsEdited, setNsEdited] = useState(false);
  const [version, setVersion] = useState(DEFAULT_MC_VERSION);
  const ns = nsEdited ? namespace : slugify(name || 'mein_pack', 'mein_pack');
  const nsError = !NAMESPACE_PATTERN.test(ns) ? 'Nur Kleinbuchstaben, Zahlen sowie _ . - erlaubt.' : ns === 'minecraft' ? '„minecraft“ ist nicht erlaubt.' : null;
  const submit = () => {
    if (nsError) return;
    startNewProject(name || 'Mein Pack', ns, version);
    onDone?.();
  };
  return (
    <div className="col" style={{ gap: 12 }}>
      <label className="field">
        <span className="field-label">Projektname</span>
        <input
          className="input"
          autoFocus
          placeholder="z.B. Mittelalter-Pack"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </label>
      <div className="field-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="field">
          <span className="field-label">Namespace (Resourcepack)</span>
          <input
            className={`input mono ${nsError ? 'invalid' : ''}`}
            value={ns}
            onChange={(e) => {
              setNsEdited(true);
              setNamespace(e.target.value.toLowerCase());
            }}
          />
          {nsError && <span className="field-error">{nsError}</span>}
        </label>
        <label className="field">
          <span className="field-label">Minecraft-Version (Server)</span>
          <select className="select" value={version} onChange={(e) => setVersion(e.target.value)}>
            {MC_VERSIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="btn primary large" disabled={!!nsError} onClick={submit}>
        <FolderPlus size={17} /> Projekt erstellen
      </button>
    </div>
  );
}

export function ProjectList({ onOpened }: { onOpened?: () => void }) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const currentId = useStore((s) => s.project?.id);
  const refresh = () => void listProjects().then(setProjects).catch(() => setProjects([]));
  useEffect(refresh, []);
  if (!isStorageAvailable()) {
    return <div className="faint small">Projekte können in diesem Browser nicht gespeichert werden. Bitte Projektdateien verwenden.</div>;
  }
  if (!projects) return <div className="faint small">Lade …</div>;
  if (projects.length === 0) return <div className="faint small">Noch keine gespeicherten Projekte.</div>;
  return (
    <div className="project-list">
      {projects.map((p) => (
        <div
          key={p.id}
          className="project-row"
          onClick={async () => {
            await openStoredProject(p.id);
            onOpened?.();
          }}
        >
          <Package size={18} className="faint" />
          <div className="pr-main">
            <div style={{ fontWeight: 600 }}>
              {p.name} {p.id === currentId && <span className="badge accent">geöffnet</span>}
            </div>
            <div className="pr-meta">
              {p.itemCount} Item(s) · <span className="mono">{p.namespace}</span> · zuletzt {new Date(p.updatedAt).toLocaleString('de-DE')}
            </div>
          </div>
          <button
            className="btn ghost icon small danger"
            title="Projekt löschen"
            onClick={(e) => {
              e.stopPropagation();
              useStore.getState().openDialog({
                type: 'confirm',
                title: 'Projekt löschen?',
                message: `„${p.name}“ wird aus diesem Browser gelöscht. Das kann nicht rückgängig gemacht werden.\nTipp: Vorher über „Projektdatei speichern“ sichern.`,
                confirmLabel: 'Endgültig löschen',
                danger: true,
                onConfirm: () => void removeStoredProject(p.id).then(refresh),
              });
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Welcome() {
  return (
    <div className="main">
      <div className="welcome">
        <div className="welcome-hero">
          <div className="brand-logo" style={{ width: 54, height: 54, fontSize: 28, borderRadius: 14, margin: '0 auto' }}>
            N
          </div>
          <h1>NexoBuilder</h1>
          <p>
            Aus Blockbench-Modellen, Java-Modellen oder Texturen werden fertige Nexo-Items – mit Item-Config und Resourcepack als external pack.
          </p>
        </div>
        <div className="welcome-grid">
          <div className="card mb-0">
            <div className="card-header">
              <h3>Neues Projekt</h3>
            </div>
            <div className="card-body">
              <NewProjectForm />
            </div>
          </div>
          <div className="card mb-0">
            <div className="card-header">
              <h3 className="grow">Gespeicherte Projekte</h3>
              <button className="btn small" onClick={() => void openProjectFile()}>
                <Upload size={14} /> Projektdatei öffnen
              </button>
            </div>
            <div className="card-body">
              <ProjectList />
            </div>
          </div>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <b>Ordner anlegen</b>
            Jeder Ordner wird ein Unterordner in plugins/Nexo/items.
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <b>Modell ablegen</b>
            .bbmodel, .json + .png oder nur .png per Drag & Drop – mit Namen.
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <b>Eigenschaften hinzufügen</b>
            Attribute, Komponenten, Möbel, Blöcke, Rüstung und mehr.
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <b>Exportieren</b>
            ZIP in plugins/Nexo entpacken und /nexo reload ausführen.
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsDialog({ initialTab = 'open' }: { initialTab?: 'open' | 'new' }) {
  const close = useStore((s) => s.closeDialog);
  const [tab, setTab] = useState<'open' | 'new'>(initialTab);
  return (
    <Modal title="Projekte" icon={<FolderOpen size={20} />} onClose={close}>
      <div className="tabs">
        <button className={`tab ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>
          Öffnen
        </button>
        <button className={`tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>
          Neues Projekt
        </button>
      </div>
      {tab === 'open' ? (
        <div className="col">
          <ProjectList onOpened={close} />
          <button
            className="btn"
            style={{ alignSelf: 'flex-start' }}
            onClick={async () => {
              await openProjectFile();
              close();
            }}
          >
            <Upload size={14} /> Projektdatei öffnen
          </button>
        </div>
      ) : (
        <NewProjectForm onDone={close} />
      )}
    </Modal>
  );
}
