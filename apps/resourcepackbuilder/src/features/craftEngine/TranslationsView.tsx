/**
 * The translations of a CraftEngine project: its own client lang keys (`lang`, written into the resource pack's
 * language files with the item and block names, read by `<lang:key>`) and its server-side translations
 * (`translations`, read by `<i18n:key>` and `<l10n:key>`), one entry per locale. The export writes them to
 * configuration/lang/<locale>.yml and configuration/translations.yml.
 */
import { Languages } from 'lucide-react';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { craftEngineConfigFile } from '@resourcepackbuilder/export';
import { RegistryPage } from './RegistryPage';

export function TranslationsView() {
  return (
    <RegistryPage
      view="translations"
      icon={Languages}
      docs={CE_DOCS.lang}
      file={(project, group, locale) => craftEngineConfigFile(project, group === 'lang' && locale ? `lang/${locale}` : 'translations')}
    />
  );
}
