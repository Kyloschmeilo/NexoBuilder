/**
 * The global variables of a CraftEngine project: MiniMessage texts by name, which CraftEngine puts in wherever a
 * text says `<global:name>`. The export writes them to configuration/global_variables.yml.
 */
import { Braces, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_DOCS, CE_GLOBAL_VARIABLE_MAP, projectGlobalVariables } from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, craftEngineConfigFile } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setGlobalVariables } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { ProjectFieldContext } from './ProjectFieldContext';

export function GlobalVariablesView() {
  const t = useTranslations('media.globalVariables');
  const project = useOpenProject();
  const variables = projectGlobalVariables(project);
  return (
    <ProjectFieldContext>
      <PageShell>
        <PageHeader
          icon={<Braces className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count: Object.keys(variables).length })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${CRAFT_ENGINE_PLUGIN_DIR}/${craftEngineConfigFile(project, 'global_variables')}`}
              </Badge>
            </>
          }
          actions={
            <IconButton
              label={t('docs')}
              nativeButton={false}
              render={<a href={CE_DOCS.globalVariables} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        <FieldRenderer field={CE_GLOBAL_VARIABLE_MAP} value={variables} hideLabel onChange={setGlobalVariables} />
      </PageShell>
    </ProjectFieldContext>
  );
}
