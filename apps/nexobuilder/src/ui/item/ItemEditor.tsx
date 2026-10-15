import { Box, ClipboardCopy, ClipboardPaste, Copy, FolderInput, Gift, Trash2 } from 'lucide-react';
import type { ExportPlan } from '@nexobuilder/core/export/plan';
import { issuesForItem } from '@nexobuilder/core/export/plan';
import { getFolderPathLabel } from '@nexobuilder/core/project/tree';
import { ASSET_TOKEN_PREFIX } from '@nexobuilder/core/nexo/schema';
import { createTexture } from '@nexobuilder/core/model/textures';
import { readPngInfoFromDataUrl, uid } from '@nexobuilder/core/util';
import { duplicateItem, updateItem } from '../../state/actions';
import { useStore, type EditorTab } from '../../state/store';
import { MiniMessageLine } from '@nexobuilder/ui';
import { FieldContext, type FieldContextValue } from '@nexobuilder/ui';
import { readAsDataUrl } from '@nexobuilder/ui';
import { useThumbnail } from '@nexobuilder/preview';
import { confirmDeleteItem } from '../layout/Sidebar';
import { GeneralTab } from './GeneralTab';
import { ModelTab } from './ModelTab';
import { countActiveProperties, PropertiesPanel } from './PropertiesPanel';
import { YamlTab } from './YamlTab';
import { RecipesTab } from './RecipesTab';
import { giveInTestServer, useTestServerStore } from '../../state/testserver';
import { clipboardLabel, copyItemProperties, openPasteDialog, useItemClipboard } from '../../state/clipboard';

/** „Im Testserver geben“ – nur sichtbar, wenn der lokale Testserver läuft */
function GiveButton({ nexoId }: { nexoId: string }) {
  const running = useTestServerStore((s) => s.state?.status === 'running');
  if (!running) return null;
  return (
    <button
      className="btn small"
      title="Das Item im lokalen Testserver in dein Inventar legen"
      onClick={() =>
        void giveInTestServer(nexoId)
          .then((player) => useStore.getState().toast('success', `„${nexoId}“ an ${player} gegeben – du musst dafür auf dem Testserver sein.`))
          .catch((err: Error) => useStore.getState().toast('error', err.message))
      }
    >
      <Gift size={14} /> Im Testserver geben
    </button>
  );
}

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'model', label: 'Model & Pack' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'components', label: 'Components' },
  { id: 'mechanics', label: 'Mechanics' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'yaml', label: 'YAML' },
];

export function ItemEditor({ itemId, plan }: { itemId: string; plan: ExportPlan | null }) {
  const project = useStore((s) => s.project)!;
  const item = project.items[itemId];
  const activeTab = useStore((s) => s.activeTab);
  const setTab = useStore((s) => s.setActiveTab);
  const thumb = useThumbnail(item?.model ?? null);
  const clip = useItemClipboard((s) => s.clip);
  if (!item) return null;

  const issues = plan ? issuesForItem(plan.issues, item.id) : [];
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;

  const fieldContext: FieldContextValue = {
    minecraftVersion: project.settings.minecraftVersion,
    getAsset: (token) => (token.startsWith(ASSET_TOKEN_PREFIX) ? item.assets?.[token.slice(ASSET_TOKEN_PREFIX.length)] : undefined),
    uploadAsset: async (file) => {
      const dataUrl = await readAsDataUrl(file);
      if (!readPngInfoFromDataUrl(dataUrl)) {
        useStore.getState().toast('error', 'Die Datei ist kein gültiges PNG.');
        return null;
      }
      const id = uid('a');
      updateItem(item.id, (d) => {
        d.assets = d.assets ?? {};
        d.assets[id] = createTexture(id, file.name, dataUrl);
      });
      return `${ASSET_TOKEN_PREFIX}${id}`;
    },
  };

  const counts: Partial<Record<EditorTab, number>> = {
    attributes: countActiveProperties(item, 'attributes'),
    components: countActiveProperties(item, 'components'),
    mechanics: countActiveProperties(item, 'mechanics'),
    recipes: item.recipes?.length ?? 0,
  };

  return (
    <FieldContext.Provider value={fieldContext}>
      <div className="editor">
        <div className="editor-header item-header">
          <div className="editor-thumb">{thumb ? <img src={thumb} alt="" /> : <Box size={26} className="faint" />}</div>
          <div className="editor-title">
            <h1>
              <MiniMessageLine text={item.displayName || item.nexoId} />
            </h1>
            <div className="editor-meta">
              <span className="badge mono accent" title="Item-ID">
                {item.nexoId}
              </span>
              <span className="badge" title="Ordner">
                {getFolderPathLabel(project, item.folderId)}
              </span>
              <span className="badge mono">{String(item.config.material ?? 'PAPER')}</span>
              {errors > 0 && <span className="badge danger">{errors} Fehler</span>}
              {warnings > 0 && <span className="badge warning">{warnings} {warnings === 1 ? 'Warnung' : 'Warnungen'}</span>}
              {errors === 0 && warnings === 0 && <span className="badge success">Bereit</span>}
            </div>
          </div>
          <div className="editor-actions">
            <GiveButton nexoId={item.nexoId} />
            <button
              className="btn small"
              onClick={() => copyItemProperties(item.id)}
              title="Alle Eigenschaften kopieren – außer Name, Item-ID, Modell und Ordner"
            >
              <ClipboardCopy size={14} /> Kopieren
            </button>
            <button
              className="btn small"
              disabled={!clip || clip.sourceItemId === item.id}
              onClick={() => openPasteDialog([item.id])}
              title={clip ? `Eigenschaften von „${clipboardLabel(clip)}“ einfügen` : 'Zuerst bei einem anderen Item „Kopieren“ wählen'}
            >
              <ClipboardPaste size={14} /> Einfügen
            </button>
            <button className="btn small" onClick={() => duplicateItem(item.id)} title="Duplizieren">
              <Copy size={14} /> Duplizieren
            </button>
            <button className="btn small" onClick={() => useStore.getState().openDialog({ type: 'moveItem', itemId: item.id })} title="Verschieben">
              <FolderInput size={14} />
            </button>
            <button className="btn small danger" onClick={() => confirmDeleteItem(item)} title="Löschen">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map((tab) => (
            <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setTab(tab.id)} role="tab">
              {tab.label}
              {!!counts[tab.id] && <span className="tab-count">{counts[tab.id]}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'general' && <GeneralTab item={item} />}
        {activeTab === 'model' && <ModelTab item={item} plan={plan} />}
        {activeTab === 'attributes' && (
          <PropertiesPanel item={item} groups={['attributes']} title="AttributeModifiers & Enchantments" emptyText="Noch keine AttributeModifiers oder Enchantments." />
        )}
        {activeTab === 'components' && (
          <PropertiesPanel item={item} groups={['components']} title="Components" emptyText="Noch keine Components." />
        )}
        {activeTab === 'mechanics' && <PropertiesPanel item={item} groups={['mechanics']} title="Mechanics" emptyText="Noch keine Mechanics." />}
        {activeTab === 'recipes' && <RecipesTab item={item} />}
        {activeTab === 'yaml' && <YamlTab item={item} plan={plan} />}
      </div>
    </FieldContext.Provider>
  );
}
