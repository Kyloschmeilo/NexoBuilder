/**
 * A Nexo project's multipack.yml: the template packs sent with the main pack (required, on by default or toggled by
 * the player) and the optional menu to toggle them. The template packs themselves go to the server's
 * plugins/Nexo/pack/template_packs folder; the export writes only multipack.yml.
 */
import { Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MULTIPACK_FILE, multipackTemplateIds, NEXO_DOCS, NEXO_MULTIPACK_FIELD } from '@resourcepackbuilder/core/nexo';
import { NEXO_PLUGIN_DIR } from '@resourcepackbuilder/export';
import { DocsLink, Page, PageHeader, StatusPill } from '@resourcepackbuilder/ui';
import { setMultipack } from '../../commands/nexo';
import { useOpenProject } from '../../store/project';
import { NexoFieldContext } from '../dialogs/NexoFieldContext';
import { ObjectFieldRows } from '../dialogs/ObjectFieldRows';
import { FilePath, PageHint } from '../media/RegistryPageParts';

export function MultipackView() {
  const t = useTranslations('media.multipack');
  const project = useOpenProject();
  return (
    <NexoFieldContext>
      <Page
        header={
          <PageHeader
            thumb={<Layers />}
            title={t('title')}
            meta={
              <>
                <StatusPill tone="muted" label={t('count', { count: multipackTemplateIds(project).length })} />
                <FilePath path={`${NEXO_PLUGIN_DIR}/${MULTIPACK_FILE}`} />
              </>
            }
            actions={<DocsLink url={NEXO_DOCS.multipack.page} target="nexo" label={t('title')} />}
          />
        }
      >
        <PageHint>{t('hint')}</PageHint>
        <ObjectFieldRows field={NEXO_MULTIPACK_FIELD} value={project.settings.multipack} onChange={setMultipack} />
      </Page>
    </NexoFieldContext>
  );
}
