import { ImageUp, Settings, Trash2 } from 'lucide-react';
import { MC_VERSIONS } from '@resourcepackbuilder/core/minecraft/versions';
import { NAMESPACE_PATTERN, readPngInfoFromDataUrl } from '@resourcepackbuilder/core/util';
import { updateProjectSettings } from '../../state/actions';
import { useStore } from '../../state/store';
import { Modal } from '@resourcepackbuilder/ui';
import { pickFiles, readAsDataUrl } from '@resourcepackbuilder/ui';

export function SettingsDialog() {
  const project = useStore((s) => s.project)!;
  const close = useStore((s) => s.closeDialog);
  const toast = useStore((s) => s.toast);
  const s = project.settings;
  const nsError = !NAMESPACE_PATTERN.test(project.namespace)
    ? 'Nur Kleinbuchstaben, Zahlen sowie _ . - erlaubt.'
    : project.namespace === 'minecraft'
      ? '„minecraft“ ist nicht erlaubt.'
      : null;
  const packNameError = /^[A-Za-z0-9_.-]+$/.test(s.packName) ? null : 'Nur Buchstaben, Zahlen sowie _ . - erlaubt.';

  return (
    <Modal
      title="Projekt-Einstellungen"
      icon={<Settings size={20} />}
      onClose={close}
      footer={
        <button className="btn primary" onClick={close}>
          Fertig
        </button>
      }
    >
      <div className="col" style={{ gap: 16 }}>
        <div className="field-grid">
          <label className="field">
            <span className="field-label">Projektname</span>
            <input className="input" value={project.name} onChange={(e) => updateProjectSettings((p) => (p.name = e.target.value))} />
          </label>
          <label className="field">
            <span className="field-label">Minecraft-Version des Servers</span>
            <select
              className="select"
              value={s.minecraftVersion}
              onChange={(e) => updateProjectSettings((p) => (p.settings.minecraftVersion = e.target.value))}
            >
              {MC_VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <span className="field-help">Bestimmt, welche Komponenten verfügbar sind und welche Modell-Features erlaubt sind.</span>
          </label>
          <label className="field">
            <span className="field-label">Namespace im Resourcepack</span>
            <input
              className={`input mono ${nsError ? 'invalid' : ''}`}
              value={project.namespace}
              onChange={(e) => updateProjectSettings((p) => (p.namespace = e.target.value.toLowerCase()))}
            />
            {nsError ? (
              <span className="field-error">{nsError}</span>
            ) : (
              <span className="field-help">Dateien landen unter assets/{project.namespace}/…</span>
            )}
          </label>
          <label className="field">
            <span className="field-label">Name des external packs</span>
            <input
              className={`input mono ${packNameError ? 'invalid' : ''}`}
              value={s.packName}
              onChange={(e) => updateProjectSettings((p) => (p.settings.packName = e.target.value))}
            />
            {packNameError ? (
              <span className="field-error">{packNameError}</span>
            ) : (
              <span className="field-help">plugins/Nexo/pack/external_packs/{s.packName}</span>
            )}
          </label>
          <label className="field wide">
            <span className="field-label">Pack-Beschreibung (pack.mcmeta)</span>
            <input
              className="input"
              value={s.packDescription}
              onChange={(e) => updateProjectSettings((p) => (p.settings.packDescription = e.target.value))}
            />
          </label>
        </div>

        <div className="field">
          <span className="field-label">Pack-Icon (pack.png, optional)</span>
          <div className="texture-card" style={{ maxWidth: 420 }}>
            <div className="texture-thumb">{s.packIcon ? <img src={s.packIcon} alt="" /> : <ImageUp size={22} className="faint" />}</div>
            <div className="texture-info">
              <span className="faint small">Quadratisches PNG, z.B. 128×128</span>
              <div className="row">
                <button
                  className="btn small"
                  onClick={async () => {
                    const [file] = await pickFiles('.png,image/png', false);
                    if (!file) return;
                    const dataUrl = await readAsDataUrl(file);
                    if (!readPngInfoFromDataUrl(dataUrl)) {
                      toast('error', 'Die Datei ist kein gültiges PNG.');
                      return;
                    }
                    updateProjectSettings((p) => (p.settings.packIcon = dataUrl));
                  }}
                >
                  <ImageUp size={14} /> {s.packIcon ? 'Ersetzen' : 'Hochladen'}
                </button>
                {s.packIcon && (
                  <button className="btn small ghost danger" onClick={() => updateProjectSettings((p) => (p.settings.packIcon = null))}>
                    <Trash2 size={14} /> Entfernen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={s.useItemModel}
            onChange={(e) => updateProjectSettings((p) => (p.settings.useItemModel = e.target.checked))}
          />
          <span>
            ItemModel-Komponente setzen (empfohlen)
            <div className="tr-desc">
              Setzt <span className="mono">Components.item_model: nexo:&lt;item_id&gt;</span>. So bekommt jedes Item ein eigenes ItemModel statt
              CustomModelData – das vermeidet Konflikte (Minecraft 1.21.4+). Wird bei Items mit fester CustomModelData automatisch weggelassen.
            </div>
          </span>
        </label>
      </div>
    </Modal>
  );
}
