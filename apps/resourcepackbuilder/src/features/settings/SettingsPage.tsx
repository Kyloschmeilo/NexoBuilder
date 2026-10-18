/**
 * The settings page (Settings activity): the open project's settings, then this device's language and appearance
 * (colour theme and light/dark mode). Sections are separated by a top rule with a small title.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@resourcepackbuilder/ui';
import { AppearanceSettings } from './AppearanceSettings';
import { DeviceSettings } from './DeviceSettings';
import { ProjectSettings } from './ProjectSettings';

interface SettingsSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

/** One group of settings: a top rule, a title with a short description, and the fields. */
function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  const headingId = `settings-${id}`;
  return (
    <section aria-labelledby={headingId} className="@container/settings flex flex-col gap-4 border-t border-line pt-3">
      <div>
        <h2 id={headingId} className="text-label font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-meta text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** The settings page, opened by the Settings activity or the project menu. */
export function SettingsPage() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  return (
    <PageShell className="max-w-[880px] gap-6">
      <header>
        <h1 className="text-page font-semibold text-foreground">{tCommon('settings')}</h1>
        <p className="text-meta text-muted-foreground">{t('pageDescription')}</p>
      </header>
      <SettingsSection id="project" title={t('project.title')} description={t('project.description')}>
        <ProjectSettings />
      </SettingsSection>
      <SettingsSection id="device" title={t('device.title')} description={t('device.description')}>
        <DeviceSettings />
      </SettingsSection>
      <SettingsSection id="appearance" title={t('appearance.title')} description={t('appearance.description')}>
        <AppearanceSettings />
      </SettingsSection>
    </PageShell>
  );
}
