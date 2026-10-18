/**
 * The JavaScript files of a CraftEngine project: each with its path in the pack's script folder and its source.
 * `js` functions and conditions call them by `<namespace>:<path>`. The export writes them to script/<path>.js.
 */
import { ExternalLink, FileCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_DOCS, CE_SCRIPT_LIST, projectScripts } from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, craftEnginePackDir } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setCraftEngineList } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { ProjectFieldContext } from './ProjectFieldContext';

export function ScriptsView() {
  const t = useTranslations('media.scripts');
  const project = useOpenProject();
  const scripts = projectScripts(project);
  return (
    <ProjectFieldContext>
      <PageShell>
        <PageHeader
          icon={<FileCode className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count: scripts.length })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${CRAFT_ENGINE_PLUGIN_DIR}/${craftEnginePackDir(project)}/script/`}
              </Badge>
            </>
          }
          actions={
            <IconButton label={t('docs')} nativeButton={false} render={<a href={CE_DOCS.scripts} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        <FieldRenderer field={CE_SCRIPT_LIST} value={scripts} hideLabel onChange={(value) => setCraftEngineList('scripts', value)} />
      </PageShell>
    </ProjectFieldContext>
  );
}
