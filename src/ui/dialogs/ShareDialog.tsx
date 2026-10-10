import { useEffect, useState } from 'react';
import { FolderOpen, FolderSync, LoaderCircle, RefreshCw, Unplug, Users } from 'lucide-react';
import { useStore } from '../../state/store';
import {
  defaultUserName,
  isShareAvailable,
  openShareFolder,
  setShareUserName,
  shareCurrentProject,
  stopSharing,
  syncNow,
  useShareStore,
  type ShareStatus,
} from '../../state/share';
import { Modal } from '../common/Modal';

export const SHARE_STATUS_TEXT: Record<ShareStatus, string> = {
  off: 'Nicht geteilt',
  connecting: 'Verbinde …',
  synced: 'Aktuell',
  syncing: 'Überträgt …',
  offline: 'Ordner nicht erreichbar',
  error: 'Fehler',
};

export function shareStatusClass(status: ShareStatus): string {
  return status === 'synced' ? 'success' : status === 'error' ? 'danger' : status === 'off' ? '' : 'warning';
}

function NameField({ value, onChange, onCommit }: { value: string; onChange: (v: string) => void; onCommit?: () => void }) {
  return (
    <label className="field">
      <span className="field-label">Dein Name</span>
      <input
        className="input"
        value={value}
        maxLength={40}
        placeholder="z.B. Kylo"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit?.();
        }}
      />
      <span className="field-help">Die anderen sehen ihn, wenn du etwas änderst.</span>
    </label>
  );
}

export function ShareDialog() {
  const close = useStore((s) => s.closeDialog);
  const toast = useStore((s) => s.toast);
  const project = useStore((s) => s.project)!;
  const share = useShareStore();
  const available = isShareAvailable();
  const shared = share.projectId === project.id && share.status !== 'off';
  const [name, setName] = useState(share.userName);
  const [busy, setBusy] = useState(false);

  // Vorschlag für den Namen: Windows-Benutzername
  useEffect(() => {
    void defaultUserName().then((n) => setName((current) => current || n));
  }, []);

  const startSharing = async () => {
    setBusy(true);
    try {
      const folder = await shareCurrentProject(name);
      if (folder) toast('success', `Projekt wird geteilt: ${folder}`);
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmStop = () =>
    useStore.getState().openDialog({
      type: 'confirm',
      title: 'Teilen beenden?',
      message:
        'Deine Änderungen werden danach nicht mehr in den geteilten Ordner übertragen und Änderungen der anderen kommen nicht mehr an.\nDeine Kopie des Projekts und der Ordner bleiben erhalten.',
      confirmLabel: 'Teilen beenden',
      danger: true,
      onConfirm: () =>
        void stopSharing().then(() => {
          toast('info', 'Das Projekt wird nicht mehr geteilt.');
          useStore.getState().openDialog({ type: 'share' });
        }),
    });

  return (
    <Modal
      title="Projekt teilen"
      icon={<Users size={20} />}
      onClose={close}
      footer={
        <button className="btn primary" onClick={close}>
          Fertig
        </button>
      }
    >
      {!available ? (
        <div className="hint warning">
          Teilen funktioniert nur im Windows-Programm (NexoBuilder.exe), weil dafür auf einen Ordner auf deinem PC zugegriffen werden
          muss. In der Browser-Version kannst du das Projekt über „Projektdatei speichern“ weitergeben.
        </div>
      ) : shared ? (
        <div className="col" style={{ gap: 14 }}>
          <div className="share-status">
            <span className={`badge ${shareStatusClass(share.status)}`}>
              {share.status === 'syncing' || share.status === 'connecting' ? <LoaderCircle size={12} className="spin" /> : null}
              {SHARE_STATUS_TEXT[share.status]}
            </span>
            <span className="faint small">
              {share.lastSync ? `zuletzt abgeglichen ${new Date(share.lastSync).toLocaleTimeString('de-DE')}` : ''}
            </span>
            <span className="grow" />
            <button className="btn small" onClick={syncNow} title="Sofort nach Änderungen schauen">
              <RefreshCw size={14} /> Jetzt abgleichen
            </button>
          </div>
          {share.message && <div className={`hint ${share.status === 'error' ? 'warning' : ''}`}>{share.message}</div>}
          <div className="field">
            <span className="field-label">Geteilter Ordner</span>
            <div className="row" style={{ gap: 8 }}>
              <code className="share-path grow" title={share.folder ?? ''}>
                {share.folder}
              </code>
              <button className="btn small" onClick={openShareFolder}>
                <FolderOpen size={14} /> Öffnen
              </button>
            </div>
          </div>
          <NameField value={name} onChange={setName} onCommit={() => void setShareUserName(name)} />
          <div className="hint">
            Alle, die diesen Ordner in NexoBuilder geöffnet haben, sehen deine Änderungen nach wenigen Sekunden – und du ihre. Ändern zwei
            Personen gleichzeitig dasselbe Item, gilt die zuletzt gespeicherte Änderung. „Rückgängig“ betrifft nur deine eigenen Änderungen.
          </div>
          <button className="btn ghost danger" style={{ alignSelf: 'flex-start' }} onClick={confirmStop}>
            <Unplug size={15} /> Teilen beenden
          </button>
        </div>
      ) : (
        <div className="col" style={{ gap: 14 }}>
          <p className="muted" style={{ margin: 0 }}>
            Teile das Projekt über einen Ordner, den ihr gemeinsam nutzt. Änderungen kommen dann automatisch bei allen an – in beide
            Richtungen.
          </p>
          <ol className="share-steps">
            <li>
              Lege in <b>OneDrive</b>, <b>Google Drive</b> oder <b>Dropbox</b> einen Ordner an und gib ihn für deine Freunde frei.
            </li>
            <li>
              Klicke unten auf <b>Ordner wählen und teilen</b> und wähle diesen Ordner. NexoBuilder legt das Projekt darin ab.
            </li>
            <li>
              Deine Freunde öffnen den Ordner in NexoBuilder über <b>Geteiltes Projekt öffnen</b>.
            </li>
          </ol>
          <NameField value={name} onChange={setName} />
          <button className="btn primary large" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => void startSharing()}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <FolderSync size={17} />} Ordner wählen und teilen
          </button>
        </div>
      )}
    </Modal>
  );
}
