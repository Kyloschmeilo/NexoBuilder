/**
 * The settings page (Settings activity): the open project's settings, then this device's language and appearance
 * (colour theme and light/dark mode). Each group sits on its own panel with a title row above its fields.
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

/** One group of settings: a panel with a title and short description above the fields. */
function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  const headingId = `settings-${id}`;
  return (
    <section aria-labelledby={headingId} className="@container/settings min-w-0 rounded-xl border border-line bg-surface">
      <div className="border-b border-line px-3 py-2 @xl/settings:px-4">
        <h2 id={headingId} className="text-title font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-meta text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-4 p-3 @xl/settings:p-4">{children}</div>
    </section>
  );
}

/** The settings page, opened by the Settings activity or the project menu. */
export function SettingsPage() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  return (
    <PageShell className="max-w-[880px] gap-3">
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
