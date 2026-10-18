import { useTranslations } from 'next-intl';
import { activeProperties, type FormSchema } from '@resourcepackbuilder/core/form';
import type { Item } from '@resourcepackbuilder/core/project';
import { issuesFor } from '@resourcepackbuilder/utils';
import { PageShell } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@resourcepackbuilder/ui/components/tabs';
import { FieldContext } from '../../components/editor';
import { isOneOf } from '../../lib/isOneOf';
import { usePlan } from '../../shell/PlanProvider';
import { useOpenProject } from '../../store/project';
import { setEditorSection, useUiStore, type EditorSection } from '../../store/ui';
import { GeneralTab } from './GeneralTab';
import { ItemHeader } from './ItemHeader';
import { ModelTab } from './model/ModelTab';
import { PropertiesPanel } from './properties/PropertiesPanel';
import { useProjectForm } from './properties/useProjectForm';
import { RecipesTab } from './recipes/RecipesTab';
import { useItemFieldContext } from './useItemFieldContext';
import { YamlTab } from './YamlTab';

type ItemTranslator = ReturnType<typeof useTranslations<'item'>>;

/** The editor's tabs with their labels: the fixed ones around the property tabs of the form. */
function editorTabs(schema: FormSchema, t: ItemTranslator): Array<{ id: EditorSection; label: string }> {
  return [
    { id: 'general', label: t('editor.tabs.general') },
    { id: 'model', label: t('editor.tabs.model') },
    // Property tab ids come from the form at runtime; a test checks the catalogue has a label for each of them
    ...schema.tabs.map((tab) => ({ id: tab.id, label: t(`editor.tabs.${tab.id}` as never) })),
    { id: 'recipes', label: t('editor.tabs.recipes') },
    { id: 'yaml', label: t('editor.tabs.yaml') },
  ];
}

/** Number shown on a tab: how many entries it has. */
function tabCounts(schema: FormSchema, item: Item): Partial<Record<EditorSection, number>> {
  return {
    ...Object.fromEntries(
      schema.tabs.map((tab) => {
        const only = tab.only?.(item.config);
        return [tab.id, activeProperties(schema, item, tab.group).filter((def) => !only || only.includes(def.id)).length];
      }),
    ),
    recipes: item.recipes.length,
  };
}

function ItemEditorContent({ item }: { item: Item }) {
  const t = useTranslations('item');
  const plan = usePlan();
  const activeTab = useUiStore((s) => s.editorSection);
  const fieldContext = useItemFieldContext(item);
  const schema = useProjectForm();
  const issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : [];
  const tabs = editorTabs(schema, t);
  const tabIds = tabs.map((tab) => tab.id);
  const counts = tabCounts(schema, item);

  return (
    <FieldContext.Provider value={fieldContext}>
      {/* PageShell is a size container: the editor's layout follows the width of the main area, not of the window */}
      <PageShell className="gap-5">
        <ItemHeader item={item} issues={issues} />
        <Tabs
          value={tabIds.includes(activeTab) ? activeTab : 'general'}
          onValueChange={(value) => {
            if (isOneOf(tabIds, value)) setEditorSection(value);
          }}
          className="gap-5"
        >
          <TabsList variant="line" className="w-full flex-wrap justify-start gap-1 border-b p-0 group-data-horizontal/tabs:h-auto">
            {tabs.map(({ id, label }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="group/tab h-10 flex-none rounded-b-none px-3 after:bg-primary group-data-horizontal/tabs:after:-bottom-px hover:bg-muted"
              >
                {label}
                {!!counts[id] && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 font-mono text-muted-foreground group-data-active/tab:border-primary group-data-active/tab:bg-primary/10 group-data-active/tab:text-primary"
                  >
                    {counts[id]}
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
          {schema.tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              <PropertiesPanel item={item} group={tab.group} only={tab.only?.(item.config)} />
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
