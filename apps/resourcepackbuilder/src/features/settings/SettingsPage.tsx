/**
 * The settings page (Settings activity): the open project's settings in the groups General, Resource pack, the
 * plugin's item option (Items for Nexo, Categories for CraftEngine) and Sharing, then this device's language and
 * appearance. A section navigation beside the page (a select when narrow) jumps between the groups.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Page, PageHeader, Section, SectionNav, type SectionNavItem, useSectionSpy } from '@resourcepackbuilder/ui';
import { Settings } from 'lucide-react';
import { PACK_NAME_PATTERN } from '@resourcepackbuilder/minecraft';
import { useNamespaceProblem } from '../../components/NamespaceProblem';
import { useOpenProject } from '../../store/project';
import { AppearanceSettings } from './AppearanceSettings';
import { DeviceSettings } from './DeviceSettings';
import { GeneralSettings, PackSettings, TargetItemSettings } from './ProjectSettings';
import { SharingSettings } from './SharingSettings';

/** The ids of the settings sections, in page order. */
export const SETTINGS_SECTIONS = ['general', 'pack', 'items', 'categories', 'sharing', 'device', 'appearance'] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number];

interface SectionDef {
  id: SettingsSectionId;
  content: ReactNode;
  tone?: 'error';
}

/** The settings page, opened by the Settings activity or the project menu. */
export function SettingsPage() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const checkNamespace = useNamespaceProblem();
  const hasGeneralError = checkNamespace(project.namespace, project.target)?.isError === true;
  const hasPackError = !PACK_NAME_PATTERN.test(project.settings.packName);

  const sections: SectionDef[] = [
    { id: 'general', content: <GeneralSettings />, tone: hasGeneralError ? 'error' : undefined },
    { id: 'pack', content: <PackSettings />, tone: hasPackError ? 'error' : undefined },
    // Each plugin has one item option of its own; the other plugin's export ignores it
    { id: project.target === 'craftengine' ? 'categories' : 'items', content: <TargetItemSettings /> },
    { id: 'sharing', content: <SharingSettings /> },
    { id: 'device', content: <DeviceSettings /> },
    { id: 'appearance', content: <AppearanceSettings /> },
  ];
  const ids = sections.map((s) => s.id);
  const { activeId, scrollTo } = useSectionSpy(ids);
  const navItems: SectionNavItem[] = sections.map((s) => ({ id: s.id, label: t(`sections.${s.id}.title`), tone: s.tone }));

  return (
    <Page
      header={<PageHeader icon={<Settings />} title={tCommon('settings')} meta={<span>{t('pageDescription')}</span>} />}
      nav={<SectionNav items={navItems} activeId={activeId} onSelect={scrollTo} label={t('sectionsLabel')} />}
    >
      {sections.map((s) => (
        <Section key={s.id} id={s.id} title={t(`sections.${s.id}.title`)} description={t(`sections.${s.id}.description`)}>
          {s.content}
        </Section>
      ))}
    </Page>
  );
}
