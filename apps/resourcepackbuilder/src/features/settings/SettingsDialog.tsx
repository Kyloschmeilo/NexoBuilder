import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Settings } from 'lucide-react';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardContent } from '@resourcepackbuilder/ui/components/card';
import { createDialogHandle } from '@resourcepackbuilder/ui/components/dialog';
import { FieldDescription, FieldLegend, FieldSet } from '@resourcepackbuilder/ui/components/field';
import { DialogFrame, FeatureDialog } from '../../components/DialogFrame';
import { DeviceSettings } from './DeviceSettings';
import { ProjectSettings } from './ProjectSettings';

function SettingsGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <FieldSet>
      <div>
        <FieldLegend className="font-heading tracking-wide uppercase">{title}</FieldLegend>
        <FieldDescription>{description}</FieldDescription>
      </div>
      {children}
    </FieldSet>
  );
}

/** Opens the settings of the open project and of this device. */
export const settingsDialog = createDialogHandle<void>();

function SettingsFrame() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  return (
    <DialogFrame
      title={tCommon('settings')}
      icon={<Settings />}
      footer={<Button onClick={() => settingsDialog.close()}>{tCommon('done')}</Button>}
    >
      <div className="flex flex-col gap-6">
        <SettingsGroup title={t('project.title')} description={t('project.description')}>
          <ProjectSettings />
        </SettingsGroup>
        <Card variant="muted">
          <CardContent>
            <SettingsGroup title={t('device.title')} description={t('device.description')}>
              <DeviceSettings />
            </SettingsGroup>
          </CardContent>
        </Card>
      </div>
    </DialogFrame>
  );
}

/** Settings of the open project and of this device. */
export function SettingsDialog() {
  return <FeatureDialog handle={settingsDialog}>{() => <SettingsFrame />}</FeatureDialog>;
}
