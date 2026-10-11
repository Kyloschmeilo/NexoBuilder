import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, LoaderCircle, Play, Plug, RefreshCw, RotateCcw, Server, Square, Trash2, Upload } from 'lucide-react';
import type { ExportPlan } from '../../core/export/plan';
import { countIssues } from '../../core/export/plan';
import { compareVersions } from '../../core/util';
import type { TestServerConfig, TestServerStatus } from '../../state/desktop';
import { useStore } from '../../state/store';
import {
  chooseNexoJar,
  clearTestServerLog,
  isTestServerAvailable,
  loadPaperVersions,
  openTestServerFolder,
  reloadNexo,
  restartTestServer,
  sendTestServerCommand,
  setTestServerConfig,
  startTestServer,
  stopTestServer,
  syncProject,
  useTestServerStore,
} from '../../state/testserver';
import { CopyButton } from '../common/YamlView';

export const TEST_SERVER_STATUS: Record<TestServerStatus, { label: string; tone: string }> = {
  stopped: { label: 'Gestoppt', tone: '' },
  preparing: { label: 'Wird vorbereitet', tone: 'warning' },
  starting: { label: 'Startet', tone: 'warning' },
  running: { label: 'Läuft', tone: 'success' },
  stopping: { label: 'Stoppt', tone: 'warning' },
  error: { label: 'Fehler', tone: 'danger' },
};

const RAM_OPTIONS = [1, 2, 3, 4, 6, 8];

function useAction() {
  const toast = useStore((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast('success', success);
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function Console() {
  const log = useTestServerStore((s) => s.log);
  const status = useTestServerStore((s) => s.state?.status);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useLayoutEffect(() => {
    if (box.current && stick.current) box.current.scrollTop = box.current.scrollHeight;
  }, [log]);

  const send = () => {
    const text = command.trim().replace(/^\//, '');
    if (!text) return;
    void sendTestServerCommand(text);
    setHistory((h) => [text, ...h.filter((c) => c !== text)].slice(0, 30));
    setHistoryIndex(-1);
    setCommand('');
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <h3>Konsole</h3>
          <div className="desc">Ausgabe des Servers – Befehle ohne „/“ eingeben</div>
        </div>
        <button className="btn ghost small" onClick={() => void clearTestServerLog()} title="Konsole leeren">
          <Trash2 size={14} /> Leeren
        </button>
      </div>
      <div
        ref={box}
        className="server-console"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {log.length === 0 ? (
          <div className="faint">Noch keine Ausgabe.</div>
        ) : (
          log.map((entry, i) => (
            <div key={i} className={`console-line ${entry.kind}`}>
              {entry.line}
            </div>
          ))
        )}
      </div>
      <div className="console-input">
        <span className="mono faint">&gt;</span>
        <input
          className="input mono"
          value={command}
          disabled={status !== 'running'}
          placeholder={status === 'running' ? 'z.B. nexo give ruby_sword 1 Kylo  ·  gamemode creative Kylo' : 'Server läuft nicht'}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
            if (e.key === 'ArrowUp' && history.length) {
              const next = Math.min(historyIndex + 1, history.length - 1);
              setHistoryIndex(next);
              setCommand(history[next]);
              e.preventDefault();
            }
            if (e.key === 'ArrowDown') {
              const next = historyIndex - 1;
              setHistoryIndex(Math.max(next, -1));
              setCommand(next >= 0 ? history[next] : '');
              e.preventDefault();
            }
          }}
        />
        <button className="btn small" disabled={status !== 'running' || !command.trim()} onClick={send}>
          Senden
        </button>
      </div>
    </div>
  );
}

function VersionSelect({ config, locked }: { config: TestServerConfig; locked: boolean }) {
  const projectVersion = useStore((s) => s.project?.settings.minecraftVersion ?? '');
  const [versions, setVersions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setError(null);
    loadPaperVersions()
      .then((list) => setVersions([...list].sort((a, b) => compareVersions(b, a))))
      .catch((err: Error) => setError(err.message));
  };
  useEffect(load, []);

  // Standard: die Version des Projekts – falls es dafür (noch) kein Paper gibt, die neueste
  useEffect(() => {
    if (!versions?.length || config.paperVersion) return;
    void setTestServerConfig({ paperVersion: versions.includes(projectVersion) ? projectVersion : versions[0] });
  }, [versions, config.paperVersion, projectVersion]);

  const options = versions ?? (config.paperVersion ? [config.paperVersion] : []);
  return (
    <label className="field">
      <span className="field-label">Minecraft-Version (Paper)</span>
      <div className="row" style={{ gap: 6 }}>
        <select
          className="select grow"
          value={config.paperVersion ?? ''}
          disabled={locked || options.length === 0}
          onChange={(e) => void setTestServerConfig({ paperVersion: e.target.value })}
        >
          {options.length === 0 && <option value="">{error ? 'nicht verfügbar' : 'Lade Versionen …'}</option>}
          {options.map((v) => (
            <option key={v} value={v}>
              {v}
              {v === projectVersion ? ' (Projekt)' : ''}
            </option>
          ))}
        </select>
        {error && (
          <button className="btn small" onClick={load} title="Erneut laden">
            <RefreshCw size={14} />
          </button>
        )}
      </div>
      {error ? (
        <span className="field-error">Versionen konnten nicht geladen werden: {error}</span>
      ) : config.paperVersion && projectVersion && config.paperVersion !== projectVersion ? (
        <span className="field-help">
          Das Projekt ist für {projectVersion} eingestellt – für den Test am besten dieselbe Version nutzen, falls verfügbar.
        </span>
      ) : (
        <span className="field-help">Dein Minecraft muss dieselbe Version haben.</span>
      )}
    </label>
  );
}

function Setup({ config, locked }: { config: TestServerConfig; locked: boolean }) {
  const { busy, run } = useAction();
  const [name, setName] = useState(config.playerName);
  useEffect(() => setName(config.playerName), [config.playerName]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <h3>Einrichtung</h3>
          <div className="desc">{locked ? 'Änderungen gelten beim nächsten Start.' : 'Wird beim ersten Start automatisch heruntergeladen (Paper, ggf. Java).'}</div>
        </div>
      </div>
      <div className="card-body">
        <div className="field-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div className="field">
            <span className="field-label">Nexo-Plugin</span>
            <div className="row" style={{ gap: 8 }}>
              <span className={`badge ${config.nexoJar ? 'success' : 'warning'}`}>
                {config.nexoJar ? `${config.nexoJar.name} ${config.nexoJar.version}` : 'nicht ausgewählt'}
              </span>
              <button
                className="btn small"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const jar = await chooseNexoJar();
                    if (jar) useStore.getState().toast('success', `Nexo ${jar.version} wird im Testserver verwendet.`);
                  })
                }
              >
                <Upload size={14} /> JAR auswählen …
              </button>
            </div>
            <span className="field-help">Deine Nexo-JAR (z.B. von Polymart). Sie wird nur in den lokalen Testserver kopiert.</span>
          </div>
          <VersionSelect config={config} locked={locked} />
          <label className="field">
            <span className="field-label">Dein Minecraft-Name</span>
            <input
              className="input"
              value={name}
              placeholder="z.B. Kylo"
              maxLength={16}
              onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))}
              onBlur={() => name !== config.playerName && void setTestServerConfig({ playerName: name })}
            />
            <span className="field-help">Bekommt OP-Rechte und die Items über „Im Testserver geben“.</span>
          </label>
          <label className="field">
            <span className="field-label">Arbeitsspeicher</span>
            <select className="select" value={config.ramGb} disabled={locked} onChange={(e) => void setTestServerConfig({ ramGb: Number(e.target.value) })}>
              {RAM_OPTIONS.map((gb) => (
                <option key={gb} value={gb}>
                  {gb} GB
                </option>
              ))}
            </select>
            <span className="field-help">2 GB reichen zum Testen.</span>
          </label>
          <label className="field">
            <span className="field-label">Port</span>
            <input
              className="input mono"
              type="number"
              min={1024}
              max={65535}
              value={config.port}
              disabled={locked}
              onChange={(e) => void setTestServerConfig({ port: Number(e.target.value) })}
            />
            <span className="field-help">Standard 25565. Pack-Download über Port {config.packPort}.</span>
          </label>
        </div>
        <label className="toggle-row" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={config.eulaAccepted} onChange={(e) => void setTestServerConfig({ eulaAccepted: e.target.checked })} />
          <span>
            Ich akzeptiere die{' '}
            <a href="https://aka.ms/MinecraftEULA" target="_blank" rel="noreferrer">
              Minecraft-EULA
            </a>
            <div className="tr-desc">Ohne Zustimmung darf ein Minecraft-Server nicht gestartet werden.</div>
          </span>
        </label>
      </div>
    </div>
  );
}

const PACK_TEXT = {
  idle: { label: 'Resourcepack: noch nicht erstellt', tone: '' },
  building: { label: 'Resourcepack wird erstellt …', tone: 'warning' },
  ready: { label: 'Resourcepack bereit', tone: 'success' },
  failed: { label: 'Resourcepack fehlgeschlagen', tone: 'danger' },
} as const;

/** Was Nexo gerade mit dem Resourcepack macht (aus der Server-Ausgabe) */
function PackStatus() {
  const state = useTestServerStore((s) => s.state)!;
  const { busy, run } = useAction();
  const pack = state.pack ?? { status: 'idle', message: null, at: null };
  const info = PACK_TEXT[pack.status];
  const player = state.config.playerName;
  return (
    <div className="card-body row" style={{ gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
      <span className={`badge ${info.tone}`}>
        {pack.status === 'building' && <LoaderCircle size={12} className="spin" />}
        {info.label}
      </span>
      <span className="grow faint small mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pack.message ?? ''}>
        {pack.status === 'failed' ? pack.message : pack.status === 'ready' ? pack.message : ''}
      </span>
      <button
        className="btn small"
        disabled={busy || pack.status === 'building'}
        title="Nexo neu laden und das Resourcepack neu erstellen"
        onClick={() => void run(reloadNexo)}
      >
        <RefreshCw size={14} /> Nexo neu laden
      </button>
      <button
        className="btn small"
        disabled={busy || pack.status !== 'ready' || !player}
        title={player ? `Das Resourcepack erneut an ${player} schicken` : 'Bitte unten deinen Minecraft-Namen eintragen'}
        onClick={() => void run(() => sendTestServerCommand(`nexo pack ${player}`))}
      >
        <Upload size={14} /> Pack erneut senden
      </button>
    </div>
  );
}

function SyncCard({ plan }: { plan: ExportPlan | null }) {
  const state = useTestServerStore((s) => s.state)!;
  const { syncing, lastResult, lastCheck, syncError } = useTestServerStore();
  const time = (t: number) => new Date(t).toLocaleTimeString('de-DE');
  const counts = plan ? countIssues(plan.issues) : null;
  const running = state.status === 'running';
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <h3>Projekt übertragen</h3>
          <div className="desc">Items, Rezepte, Glyphen und Resourcepack nach plugins/Nexo – danach „nexo reload all“</div>
        </div>
        <button className="btn small" disabled={!running || syncing} onClick={() => void syncProject(true)}>
          {syncing ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />} Jetzt übertragen
        </button>
      </div>
      <div className="card-body">
        <label className="toggle-row">
          <input type="checkbox" checked={state.config.autoUpdate} onChange={(e) => void setTestServerConfig({ autoUpdate: e.target.checked })} />
          <span>
            Automatisch übertragen, wenn ich etwas ändere
            <div className="tr-desc">Neue Items, geänderte Modelle und Eigenschaften sind nach wenigen Sekunden im Spiel – das Resourcepack wird neu geschickt.</div>
          </span>
        </label>
        <div className="faint small" style={{ marginTop: 6 }}>
          {syncError
            ? null
            : [
                lastResult
                  ? `Zuletzt übertragen ${time(lastResult.at)}: ${lastResult.written} ${lastResult.written === 1 ? 'Datei' : 'Dateien'} geschrieben, ${lastResult.deleted} entfernt${lastResult.reloaded ? ', Nexo neu geladen' : ''}.`
                  : running
                    ? null
                    : 'Wird beim Start übertragen.',
                lastCheck && (!lastResult || lastCheck > lastResult.at) ? `Alles aktuell (geprüft ${time(lastCheck)}).` : null,
              ]
                .filter(Boolean)
                .join(' ')}
          {lastResult?.skipped ? ` ${lastResult.skipped} Datei(en) mit ungültigem Namen übersprungen – siehe Konsole.` : ''}
        </div>
        {syncError && <div className="hint warning" style={{ marginTop: 8 }}>Übertragen fehlgeschlagen: {syncError}</div>}
        {counts && counts.error > 0 && (
          <div className="hint warning" style={{ marginTop: 8 }}>
            Das Projekt hat {counts.error} Fehler (siehe „Exportieren“) – betroffene Items funktionieren im Spiel evtl. nicht.
          </div>
        )}
      </div>
    </div>
  );
}

export function TestServerView({ plan }: { plan: ExportPlan | null }) {
  const state = useTestServerStore((s) => s.state);
  const { busy, run } = useAction();
  const status = state ? TEST_SERVER_STATUS[state.status] : null;
  const working = state ? ['preparing', 'starting', 'stopping'].includes(state.status) : false;
  const running = state?.status === 'running';
  const locked = !!state && state.status !== 'stopped' && state.status !== 'error';
  const uptime = useMemo(() => (state?.startedAt ? new Date(state.startedAt).toLocaleTimeString('de-DE') : null), [state?.startedAt]);

  if (!isTestServerAvailable()) {
    return (
      <div className="editor">
        <div className="hint warning">
          Der lokale Testserver funktioniert nur im Windows-Programm (NexoBuilder.exe), weil dafür ein Minecraft-Server auf deinem PC gestartet wird.
        </div>
      </div>
    );
  }
  if (!state) return <div className="empty-state">Lade …</div>;

  const missing = !state.config.eulaAccepted ? 'Bitte zuerst die Minecraft-EULA akzeptieren.' : !state.config.paperVersion ? 'Bitte eine Minecraft-Version wählen.' : null;

  return (
    <div className="editor">
      <div className="editor-header">
        <div className="editor-thumb" style={{ color: 'var(--success)' }}>
          <Server size={30} />
        </div>
        <div className="editor-title">
          <h1>Testserver</h1>
          <div className="editor-meta">
            {status && (
              <span className={`badge ${status.tone}`}>
                {working && <LoaderCircle size={12} className="spin" />}
                {status.label}
              </span>
            )}
            {state.installed && (
              <span className="badge mono">
                Paper {state.installed.paperVersion} · Java {state.installed.javaVersion}
              </span>
            )}
            {running && uptime && <span className="badge">seit {uptime}</span>}
          </div>
        </div>
        {running || working ? (
          <>
            <button className="btn" disabled={busy || working} onClick={() => void run(restartTestServer)}>
              <RotateCcw size={15} /> Neu starten
            </button>
            <button className="btn danger" disabled={busy || state.status === 'stopping' || state.status === 'preparing'} onClick={() => void run(stopTestServer)}>
              <Square size={15} /> Stoppen
            </button>
          </>
        ) : (
          <button className="btn primary large" disabled={busy || !!missing} title={missing ?? undefined} onClick={() => void run(startTestServer)}>
            <Play size={17} /> Server starten
          </button>
        )}
      </div>

      {state.message && (
        <div className={`hint ${state.status === 'error' ? 'warning' : ''}`}>
          {working && <LoaderCircle size={14} className="spin" />}
          <span>{state.message}</span>
          {state.progress !== null && <progress className="grow" max={100} value={state.progress} />}
        </div>
      )}
      {!state.config.nexoJar && (
        <div className="hint warning">Ohne Nexo-Plugin startet der Server zwar, deine Items werden aber nicht geladen. Wähle unten deine Nexo-JAR aus.</div>
      )}

      <div className="card">
        <div className="card-body row" style={{ gap: 14, flexWrap: 'wrap' }}>
          <Plug size={20} className="faint" />
          <div className="grow">
            <div style={{ fontWeight: 600 }}>
              Verbinden: Minecraft {state.config.paperVersion ?? ''} → Mehrspieler → Direktverbindung →{' '}
              <span className="mono">{state.address}</span>
            </div>
            <div className="faint small">Das Resourcepack kommt beim Betreten automatisch. Nach jeder Änderung schickt Nexo das neue Pack.</div>
          </div>
          <CopyButton text={state.address} />
          <button className="btn small" onClick={openTestServerFolder} title="Serverordner im Explorer öffnen">
            <FolderOpen size={14} /> Ordner
          </button>
        </div>
        {running && state.config.nexoJar && <PackStatus />}
      </div>

      <SyncCard plan={plan} />
      <Console />
      <Setup config={state.config} locked={locked} />
    </div>
  );
}
