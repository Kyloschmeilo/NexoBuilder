/**
 * The loot sources of a CraftEngine project: each binds a loot table to a vanilla loot event (breaking a block, killing
 * an entity, fishing …). Edited as one typed list over CraftEngine's loot source types; the export writes them to
 * configuration/loot_sources.yml.
 */
import { ExternalLink, Gem } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_DOCS, CE_LOOT_SOURCE_LIST, projectLootSources } from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, craftEngineConfigFile } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setLootSources } from '../../commands/lootSources';
import { FieldContext, type FieldContextValue, FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';

export function LootSourcesView() {
  const t = useTranslations('media.lootSources');
  const project = useOpenProject();
  const sources = projectLootSources(project);
  // Loot sources have no textures of their own
  const fieldContext: FieldContextValue = {
    minecraftVersion: project.settings.minecraftVersion,
    getAsset: () => undefined,
    uploadAsset: () => Promise.resolve(null),
  };
  return (
    <FieldContext.Provider value={fieldContext}>
      <PageShell>
        <PageHeader
          icon={<Gem className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count: sources.length })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${CRAFT_ENGINE_PLUGIN_DIR}/${craftEngineConfigFile(project, 'loot_sources')}`}
              </Badge>
            </>
          }
          actions={
            <IconButton label={t('docs')} nativeButton={false} render={<a href={CE_DOCS.lootSources} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        <FieldRenderer field={CE_LOOT_SOURCE_LIST} value={sources} hideLabel onChange={setLootSources} />
      </PageShell>
    </FieldContext.Provider>
  );
}
