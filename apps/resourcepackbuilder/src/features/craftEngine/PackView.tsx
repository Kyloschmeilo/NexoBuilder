/**
 * The pack settings of a CraftEngine project: its pack.yml values (author, version, enable, subpacks) on the overview,
 * and its config factories (a blueprint of config sections read once per instance) as entries. The export writes
 * pack.yml and configuration/config_factories.yml.
 */
import { Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CE_DOCS, CE_PACK_FIELD, projectPack } from '@resourcepackbuilder/core/craftEngine';
import { craftEngineConfigFile, packYmlFile } from '@resourcepackbuilder/export';
import { Section } from '@resourcepackbuilder/ui';
import { setCraftEnginePack } from '../../commands/craftEngine';
import { FieldRenderer } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { RegistryPage } from './RegistryPage';

/** The pack.yml values of the project. */
function PackYmlSection() {
  const t = useTranslations('media.pack');
  const project = useOpenProject();
  return (
    <Section id="packYml" title={t('packYml.title')} description={t('packYml.hint')}>
      <FieldRenderer field={CE_PACK_FIELD} value={projectPack(project)} hideLabel onChange={setCraftEnginePack} />
    </Section>
  );
}

export function PackView() {
  return (
    <RegistryPage
      view="pack"
      icon={Package}
      docs={CE_DOCS.pack}
      file={(project, group) => (group === 'configFactories' ? craftEngineConfigFile(project, 'config_factories') : packYmlFile(project))}
      before={<PackYmlSection />}
    />
  );
}
