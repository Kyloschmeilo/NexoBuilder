/**
 * A Nexo project's multipack.yml: the template packs sent with the main pack (required, on by default or toggled by
 * the player) and the optional menu to toggle them. The template packs themselves go to the server's
 * plugins/Nexo/pack/template_packs folder; the export writes only multipack.yml.
 */
import { Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MULTIPACK_FILE, multipackTemplateIds, NEXO_DOCS, NEXO_MULTIPACK_FIELD } from '@resourcepackbuilder/core/nexo';
import { NEXO_PLUGIN_DIR } from '@resourcepackbuilder/export';
import { PageHeader, PageShell } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setMultipack } from '../../commands/nexo';
import { useOpenProject } from '../../store/project';
import { NexoFieldContext } from '../dialogs/NexoFieldContext';
import { ObjectFieldRows } from '../dialogs/ObjectFieldRows';
import { DocsLinkButton } from '../media/DocsLinkButton';

export function MultipackView() {
  const t = useTranslations('media.multipack');
  const project = useOpenProject();
  return (
    <NexoFieldContext>
      <PageShell>
        <PageHeader
          icon={<Layers className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count: multipackTemplateIds(project).length })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${NEXO_PLUGIN_DIR}/${MULTIPACK_FILE}`}
              </Badge>
            </>
          }
          actions={<DocsLinkButton href={NEXO_DOCS.multipack.page} label={t('docs')} />}
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        <ObjectFieldRows field={NEXO_MULTIPACK_FIELD} value={project.settings.multipack} onChange={setMultipack} />
      </PageShell>
    </NexoFieldContext>
  );
}
