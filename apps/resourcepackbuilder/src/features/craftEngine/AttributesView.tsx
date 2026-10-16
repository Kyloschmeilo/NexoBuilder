/**
 * The attribute system of a CraftEngine project (experimental): its custom attributes, operations, equipment sets and
 * damage rules, one list each. Items add modifiers and join sets in their settings. The export writes all of it to
 * configuration/attributes.yml; CraftEngine only reads it with `attribute.enable: true` in its config.yml.
 */
import { Dumbbell, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type AttributePart, CE_ATTRIBUTE_LISTS, CE_DOCS, projectAttributeEntries } from '@resourcepackbuilder/core/craftEngine';
import { CRAFT_ENGINE_PLUGIN_DIR, craftEngineConfigFile } from '@resourcepackbuilder/export';
import { IconButton, PageHeader, PageShell, SectionCard } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { setAttributeEntries } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { ProjectFieldContext } from './ProjectFieldContext';

const PARTS: AttributePart[] = ['definitions', 'operations', 'equipmentSets', 'damageRules'];

export function AttributesView() {
  const t = useTranslations('media.attributes');
  const project = useOpenProject();
  const count = PARTS.reduce((sum, part) => sum + projectAttributeEntries(project, part).length, 0);
  return (
    <ProjectFieldContext>
      <PageShell>
        <PageHeader
          icon={<Dumbbell className="size-7" />}
          title={t('title')}
          meta={
            <>
              <Badge variant="secondary">{t('count', { count })}</Badge>
              <Badge variant="outline" className="max-w-full truncate font-mono">
                {`${CRAFT_ENGINE_PLUGIN_DIR}/${craftEngineConfigFile(project, 'attributes')}`}
              </Badge>
            </>
          }
          actions={
            <IconButton label={t('docs')} nativeButton={false} render={<a href={CE_DOCS.attributes} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
            </IconButton>
          }
        />
        <Alert variant="info">
          <AlertDescription>{t('hint')}</AlertDescription>
        </Alert>
        {PARTS.map((part) => (
          <SectionCard key={part} title={t(`${part}.title`)} description={t(`${part}.hint`)}>
            <FieldRenderer
              field={CE_ATTRIBUTE_LISTS[part]}
              value={projectAttributeEntries(project, part)}
              hideLabel
              onChange={(value) => setAttributeEntries(part, value)}
            />
          </SectionCard>
        ))}
      </PageShell>
    </ProjectFieldContext>
  );
}
