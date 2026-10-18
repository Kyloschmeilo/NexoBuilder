/**
 * The worldgen features of a CraftEngine project: configured features (what a tree, ore or flower looks like, as
 * YAML) and placed features (where and how often one generates). Saplings grow configured features, grass blocks
 * placed features. The export writes both to configuration/worldgen.yml.
 */
import { ExternalLink, Trees } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  CE_CONFIGURED_FEATURE_LIST,
  CE_DOCS,
  CE_PLACED_FEATURE_LIST,
  projectConfiguredFeatures,
  projectPlacedFeatures,
} from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, craftEngineConfigFile } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell, SectionCard } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setCraftEngineList } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { ProjectFieldContext } from './ProjectFieldContext';

export function WorldgenView() {
  const t = useTranslations('media.worldgen');
  const project = useOpenProject();
  const configured = projectConfiguredFeatures(project);
  const placed = projectPlacedFeatures(project);
  return (
    <ProjectFieldContext>
      <PageShell>
        <PageHeader
          icon={<Trees className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count: configured.length + placed.length })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${CRAFT_ENGINE_PLUGIN_DIR}/${craftEngineConfigFile(project, 'worldgen')}`}
              </Badge>
            </>
          }
          actions={
            <IconButton label={t('docs')} nativeButton={false} render={<a href={CE_DOCS.worldgen} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        <SectionCard title={t('configured.title')} description={t('configured.hint')}>
          <FieldRenderer
            field={CE_CONFIGURED_FEATURE_LIST}
            value={configured}
            hideLabel
            onChange={(value) => setCraftEngineList('configuredFeatures', value)}
          />
        </SectionCard>
        <SectionCard title={t('placed.title')} description={t('placed.hint')}>
          <FieldRenderer
            field={CE_PLACED_FEATURE_LIST}
            value={placed}
            hideLabel
            onChange={(value) => setCraftEngineList('placedFeatures', value)}
          />
        </SectionCard>
      </PageShell>
    </ProjectFieldContext>
  );
}
