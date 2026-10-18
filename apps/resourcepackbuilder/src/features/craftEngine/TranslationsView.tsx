/**
 * The translations of a CraftEngine project: its own client lang keys (`lang`, written into the resource pack's
 * language files with the item and block names, read by `<lang:key>`) and its server-side translations
 * (`translations`, read by `<i18n:key>` and `<l10n:key>`). The export writes them to configuration/lang/<locale>.yml
 * and configuration/translations.yml.
 */
import { ExternalLink, Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_DOCS, CE_LANG_MAP, CE_TRANSLATION_MAP, projectLang, projectServerTranslations } from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, craftEngineConfigFile } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell, SectionCard } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setLang, setServerTranslations } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { ProjectFieldContext } from './ProjectFieldContext';

/** The number of keys over all locales */
const keyCount = (texts: Record<string, Record<string, string>>) =>
  Object.values(texts).reduce((sum, keys) => sum + Object.keys(keys).length, 0);

export function TranslationsView() {
  const t = useTranslations('media.translations');
  const project = useOpenProject();
  const lang = projectLang(project);
  const translations = projectServerTranslations(project);
  return (
    <ProjectFieldContext>
      <PageShell>
        <PageHeader
          icon={<Languages className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count: keyCount(lang) + keyCount(translations) })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${CRAFT_ENGINE_PLUGIN_DIR}/${craftEngineConfigFile(project, 'translations')}`}
              </Badge>
            </>
          }
          actions={
            <IconButton label={t('docs')} nativeButton={false} render={<a href={CE_DOCS.lang} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        <SectionCard title={t('lang.title')} description={t('lang.hint')}>
          <FieldRenderer field={CE_LANG_MAP} value={lang} hideLabel onChange={setLang} />
        </SectionCard>
        <SectionCard title={t('server.title')} description={t('server.hint')}>
          <FieldRenderer field={CE_TRANSLATION_MAP} value={translations} hideLabel onChange={setServerTranslations} />
        </SectionCard>
      </PageShell>
    </ProjectFieldContext>
  );
}
