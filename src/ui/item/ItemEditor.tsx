import { Box, Copy, FolderInput, Trash2 } from 'lucide-react';
import type { ExportPlan } from '../../core/export/plan';
import { issuesForItem } from '../../core/export/plan';
import { getFolderPathLabel } from '../../core/project/tree';
import { ASSET_TOKEN_PREFIX } from '../../core/nexo/schema';
import { createTexture } from '../../core/model/textures';
import { readPngInfoFromDataUrl, uid } from '../../core/util';
import { duplicateItem, updateItem } from '../../state/actions';
import { useStore, type EditorTab } from '../../state/store';
import { MiniMessageLine } from '../common/MiniMessage';
import { FieldContext, type FieldContextValue } from '../form/FieldRenderer';
import { readAsDataUrl } from '../files';
import { useThumbnail } from '../preview/thumbnail';
import { confirmDeleteItem } from '../layout/Sidebar';
import { GeneralTab } from './GeneralTab';
import { ModelTab } from './ModelTab';
import { countActiveProperties, PropertiesPanel } from './PropertiesPanel';
import { YamlTab } from './YamlTab';
import { RecipesTab } from './RecipesTab';

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: 'general', label: 'Allgemein' },
  { id: 'model', label: 'Modell & Aussehen' },
  { id: 'attributes', label: 'Attribute' },
  { id: 'components', label: 'Komponenten' },
  { id: 'mechanics', label: 'Mechaniken' },
  { id: 'recipes', label: 'Rezepte' },
  { id: 'yaml', label: 'YAML' },
];

export function ItemEditor({ itemId, plan }: { itemId: string; plan: ExportPlan | null }) {
  const project = useStore((s) => s.project)!;
  const item = project.items[itemId];
  const activeTab = useStore((s) => s.activeTab);
  const setTab = useStore((s) => s.setActiveTab);
  const thumb = useThumbnail(item?.model ?? null);
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
        <div className="editor-header">
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
              {warnings > 0 && <span className="badge warning">{warnings} Warnungen</span>}
              {errors === 0 && warnings === 0 && <span className="badge success">Bereit</span>}
            </div>
          </div>
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
          <PropertiesPanel item={item} groups={['attributes']} title="Attribute & Verzauberungen" emptyText="Keine Attribute oder Verzauberungen." />
        )}
        {activeTab === 'components' && (
          <PropertiesPanel item={item} groups={['components']} title="Komponenten" emptyText="Keine Komponenten." />
        )}
        {activeTab === 'mechanics' && <PropertiesPanel item={item} groups={['mechanics']} title="Mechaniken" emptyText="Keine Mechaniken." />}
        {activeTab === 'recipes' && <RecipesTab item={item} />}
        {activeTab === 'yaml' && <YamlTab item={item} plan={plan} />}
      </div>
    </FieldContext.Provider>
  );
}
