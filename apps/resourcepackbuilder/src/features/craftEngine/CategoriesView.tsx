/**
 * The item browser categories of a CraftEngine project (`/ce`): each with its id, name, lore, icon, priority,
 * visibility, conditions and sources. Items add themselves with their Category property. The export writes them to
 * configuration/categories.yml, after the categories of the folders when the project setting creates those.
 */
import { LayoutGrid } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { craftEngineConfigFile } from '@resourcepackbuilder/export';
import { useOpenProject } from '../../store/project';
import { RegistryPage } from './RegistryPage';

export function CategoriesView() {
  const t = useTranslations('media.categories');
  const project = useOpenProject();
  return (
    <RegistryPage
      view="categories"
      icon={LayoutGrid}
      docs={CE_DOCS.categories}
      file={(p) => craftEngineConfigFile(p, 'categories')}
      hint={`${t('hint')} ${project.settings.ceCategoriesFromFolders ? t('fromFoldersOn') : t('fromFoldersOff')}`}
    />
  );
}
