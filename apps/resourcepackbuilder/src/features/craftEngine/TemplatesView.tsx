/**
 * The templates of a CraftEngine project: each with its id, its declared arguments and its body (config with
 * `${argument}` placeholders). The export writes them to configuration/templates.yml. Below the list: CraftEngine's
 * default templates with the arguments each takes, which every project can use.
 */
import { ExternalLink, LayoutTemplate } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_DEFAULT_TEMPLATES, CE_DOCS, CE_TEMPLATE_LIST, projectTemplates } from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, craftEngineConfigFile } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';
import { setTemplates } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { ProjectFieldContext } from './ProjectFieldContext';

export function TemplatesView() {
  const t = useTranslations('media.templates');
  const project = useOpenProject();
  const templates = projectTemplates(project);
  return (
    <ProjectFieldContext>
      <PageShell>
        <PageHeader
          icon={<LayoutTemplate className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count: templates.length })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${CRAFT_ENGINE_PLUGIN_DIR}/${craftEngineConfigFile(project, 'templates')}`}
              </Badge>
            </>
          }
          actions={
            <IconButton label={t('docs')} nativeButton={false} render={<a href={CE_DOCS.templates} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        <FieldRenderer field={CE_TEMPLATE_LIST} value={templates} hideLabel onChange={setTemplates} />
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t('defaults')}</CardTitle>
            <CardDescription>{t('defaultsHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 font-mono text-xs">
              {CE_DEFAULT_TEMPLATES.map(({ id, required = [], optional = [] }) => (
                <li key={id} className="flex flex-wrap gap-x-2">
                  <span>{id}</span>
                  {required.length + optional.length > 0 && (
                    <span className="text-muted-foreground">{[...required.map((name) => `${name}*`), ...optional].join(', ')}</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </PageShell>
    </ProjectFieldContext>
  );
}
