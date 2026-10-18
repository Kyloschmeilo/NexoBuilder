/**
 * The texture atlases of a CraftEngine project: which textures go into a vanilla or custom atlas as sprites. Most
 * packs need none. The export writes them to configuration/atlases.yml.
 */
import { ExternalLink, Images } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_ATLAS_LIST, CE_DOCS, projectAtlases } from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, craftEngineConfigFile } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setCraftEngineList } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { ProjectFieldContext } from './ProjectFieldContext';

export function AtlasesView() {
  const t = useTranslations('media.atlases');
  const project = useOpenProject();
  const atlases = projectAtlases(project);
  return (
    <ProjectFieldContext>
      <PageShell>
        <PageHeader
          icon={<Images className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count: atlases.length })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${CRAFT_ENGINE_PLUGIN_DIR}/${craftEngineConfigFile(project, 'atlases')}`}
              </Badge>
            </>
          }
          actions={
            <IconButton label={t('docs')} nativeButton={false} render={<a href={CE_DOCS.atlases} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        <FieldRenderer field={CE_ATLAS_LIST} value={atlases} hideLabel onChange={(value) => setCraftEngineList('atlases', value)} />
      </PageShell>
    </ProjectFieldContext>
  );
}
