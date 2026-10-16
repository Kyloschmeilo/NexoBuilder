import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project';
import { issuesFor } from '@resourcepackbuilder/utils';
import { PageShell } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@resourcepackbuilder/ui/components/tabs';
import { FieldContext } from '../../components/editor';
import { isOneOf } from '../../lib/isOneOf';
import { usePlan } from '../../shell/PlanProvider';
import { useOpenProject } from '../../store/project';
import { setEditorTab, useUiStore, type EditorTab } from '../../store/ui';
import { GeneralTab } from './GeneralTab';
import { ItemHeader } from './ItemHeader';
import { ModelTab } from './model/ModelTab';
import { activeProperties } from '@resourcepackbuilder/core/nexo';
import { PropertiesPanel } from './properties/PropertiesPanel';
import { RecipesTab } from './recipes/RecipesTab';
import { useItemFieldContext } from './useItemFieldContext';
import { YamlTab } from './YamlTab';

const TABS: EditorTab[] = ['general', 'model', 'attributes', 'components', 'mechanics', 'recipes', 'yaml'];

/** Tabs that only hold properties of one group. */
const PROPERTY_TABS = ['attributes', 'components', 'mechanics'] as const;

/** Number shown on a tab: how many entries it has. */
function tabCounts(item: Item): Partial<Record<EditorTab, number>> {
  return {
    attributes: activeProperties(item, 'attributes').length,
    components: activeProperties(item, 'components').length,
    mechanics: activeProperties(item, 'mechanics').length,
    recipes: item.recipes.length,
  };
}

function ItemEditorContent({ item }: { item: Item }) {
  const t = useTranslations('item');
  const plan = usePlan();
  const activeTab = useUiStore((s) => s.editorTab);
  const fieldContext = useItemFieldContext(item);
  const issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : [];
  const counts = tabCounts(item);

  return (
    <FieldContext.Provider value={fieldContext}>
      {/* PageShell is a size container: the editor's layout follows the width of the main area, not of the window */}
      <PageShell className="gap-5">
        <ItemHeader item={item} issues={issues} />
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (isOneOf(TABS, value)) setEditorTab(value);
          }}
          className="gap-5"
        >
          <TabsList variant="line" className="w-full flex-wrap justify-start gap-1 border-b p-0 group-data-horizontal/tabs:h-auto">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="group/tab h-10 flex-none rounded-b-none px-3 after:bg-primary group-data-horizontal/tabs:after:-bottom-px hover:bg-muted"
              >
                {t(`editor.tabs.${tab}`)}
                {!!counts[tab] && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 font-mono text-muted-foreground group-data-active/tab:border-primary group-data-active/tab:bg-primary/10 group-data-active/tab:text-primary"
                  >
                    {counts[tab]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="general">
            <GeneralTab item={item} />
          </TabsContent>
          <TabsContent value="model">
            <ModelTab item={item} />
          </TabsContent>
          {PROPERTY_TABS.map((group) => (
            <TabsContent key={group} value={group}>
              <PropertiesPanel item={item} group={group} />
            </TabsContent>
          ))}
          <TabsContent value="recipes">
            <RecipesTab item={item} />
          </TabsContent>
          <TabsContent value="yaml">
            <YamlTab item={item} />
          </TabsContent>
        </Tabs>
      </PageShell>
    </FieldContext.Provider>
  );
}

/** The editor of one item: header with actions and the tabs of its settings. */
export function ItemEditor({ itemId }: { itemId: string }) {
  const item = useOpenProject().items[itemId];
  return item ? <ItemEditorContent item={item} /> : null;
}
