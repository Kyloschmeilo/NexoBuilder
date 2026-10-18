/**
 * The pack settings of a CraftEngine project: its pack.yml values (author, version, enable, subpacks) and its config
 * factories (a blueprint of config sections read once per instance). The export writes pack.yml and
 * configuration/config_factories.yml.
 */
import { ExternalLink, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_CONFIG_FACTORY_LIST, CE_DOCS, CE_PACK_FIELD, projectConfigFactories, projectPack } from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, packYmlFile } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell, SectionCard } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setCraftEngineList, setCraftEnginePack } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { ProjectFieldContext } from './ProjectFieldContext';

export function PackView() {
  const t = useTranslations('media.pack');
  const project = useOpenProject();
  const factories = projectConfigFactories(project);
  return (
    <ProjectFieldContext>
      <PageShell>
        <PageHeader
          icon={<Package className="size-7" />}
          title={t('title')}
          meta={
            <Badge variant="outline" className="max-w-full truncate font-mono">
              {`${CRAFT_ENGINE_PLUGIN_DIR}/${packYmlFile(project)}`}
            </Badge>
          }
          actions={
            <IconButton label={t('docs')} nativeButton={false} render={<a href={CE_DOCS.pack} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        <SectionCard title={t('packYml.title')} description={t('packYml.hint')}>
          <FieldRenderer field={CE_PACK_FIELD} value={projectPack(project)} hideLabel onChange={setCraftEnginePack} />
        </SectionCard>
        <SectionCard title={t('factories.title')} description={t('factories.hint')}>
          <FieldRenderer
            field={CE_CONFIG_FACTORY_LIST}
            value={factories}
            hideLabel
            onChange={(value) => setCraftEngineList('configFactories', value)}
          />
        </SectionCard>
      </PageShell>
    </ProjectFieldContext>
  );
}
