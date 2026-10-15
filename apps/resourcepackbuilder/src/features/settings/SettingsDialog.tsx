import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Settings } from 'lucide-react';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { FieldDescription, FieldLegend, FieldSet } from '@resourcepackbuilder/ui/components/field';
import { DialogFrame } from '../../components/DialogFrame';
import { closeDialog } from '../../store/dialogs';
import { DeviceSettings } from './DeviceSettings';
import { ProjectSettings } from './ProjectSettings';

function SettingsGroup({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <FieldSet className={className}>
      <div>
        <FieldLegend className="font-heading tracking-wide uppercase">{title}</FieldLegend>
        <FieldDescription>{description}</FieldDescription>
      </div>
      {children}
    </FieldSet>
  );
}

/** Settings of the open project and of this device. */
export function SettingsDialog() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  return (
    <DialogFrame title={tCommon('settings')} icon={<Settings />} footer={<Button onClick={closeDialog}>{tCommon('done')}</Button>}>
      <div className="flex flex-col gap-6">
        <SettingsGroup title={t('project.title')} description={t('project.description')}>
          <ProjectSettings />
        </SettingsGroup>
        <SettingsGroup
          title={t('device.title')}
          description={t('device.description')}
          className="rounded-lg border border-border bg-muted/40 p-4"
        >
          <DeviceSettings />
        </SettingsGroup>
      </div>
    </DialogFrame>
  );
}
