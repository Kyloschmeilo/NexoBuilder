/**
 * The item browser categories of a CraftEngine project (`/ce`): each with its id, name, lore, icon, priority,
 * visibility, conditions and sources. Items add themselves with their Category property. The export writes them to
 * configuration/categories.yml, after the categories of the folders when the project setting creates those.
 */
import { ExternalLink, LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_CATEGORY_LIST, CE_DOCS, projectCategories } from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, craftEngineConfigFile } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setCategories } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { ProjectFieldContext } from './ProjectFieldContext';

export function CategoriesView() {
  const t = useTranslations('media.categories');
  const project = useOpenProject();
  const categories = projectCategories(project);
  return (
    <ProjectFieldContext>
      <PageShell>
        <PageHeader
          icon={<LayoutGrid className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count: categories.length })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${CRAFT_ENGINE_PLUGIN_DIR}/${craftEngineConfigFile(project, 'categories')}`}
              </Badge>
            </>
          }
          actions={
            <IconButton label={t('docs')} nativeButton={false} render={<a href={CE_DOCS.categories} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>
            {t('hint')} {project.settings.ceCategoriesFromFolders ? t('fromFoldersOn') : t('fromFoldersOff')}
          </AlertDescription>
        </Alert>
        <FieldRenderer field={CE_CATEGORY_LIST} value={categories} hideLabel onChange={setCategories} />
      </PageShell>
    </ProjectFieldContext>
  );
}
