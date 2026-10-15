import { useTranslations } from 'next-intl';
import { ImageUp, Monitor, Moon, Settings, Sun, Trash2 } from 'lucide-react';
import { MC_VERSIONS } from '@resourcepackbuilder/core/minecraft/versions';
import { NAMESPACE_PATTERN, readPngInfoFromDataUrl } from '@resourcepackbuilder/core/util';
import { supportedLocales, type SupportedLocale } from '@resourcepackbuilder/i18n';
import { pickFiles, readAsDataUrl } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { ToggleGroup, ToggleGroupItem } from '@resourcepackbuilder/ui/components/toggle-group';
import { updateProjectSettings } from '../../state/actions';
import { useStore } from '../../state/store';
import { useLocaleStore } from '../../i18n/locale';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeChoice } from '../../theme/theme';
import { AppDialog, richTags } from './AppDialog';

const THEMES: Array<{ id: ThemeChoice; icon: typeof Sun }> = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'system', icon: Monitor },
];

export function SettingsDialog() {
  const t = useTranslations('dialogs.settings');
  const tc = useTranslations('common');
  const close = useStore((s) => s.closeDialog);
  return (
    <AppDialog
      title={tc('settings')}
      icon={<Settings />}
      footer={<Button onClick={close}>{tc('done')}</Button>}
    >
      <div className="flex flex-col gap-6">
        <FieldSet>
          <div>
            <FieldLegend className="font-heading tracking-wide uppercase">{t('project.title')}</FieldLegend>
            <FieldDescription>{t('project.description')}</FieldDescription>
          </div>
          <ProjectSettings />
        </FieldSet>
        <FieldSet className="rounded-lg border border-border bg-muted/40 p-4">
          <div>
            <FieldLegend className="font-heading tracking-wide uppercase">{t('device.title')}</FieldLegend>
            <FieldDescription>{t('device.description')}</FieldDescription>
          </div>
          <DeviceSettings />
        </FieldSet>
      </div>
    </AppDialog>
  );
}

/** Language and appearance: stored on this device, not in the project. */
function DeviceSettings() {
  const t = useTranslations('dialogs.settings');
  const tc = useTranslations('common');
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { choice, setTheme } = useTheme();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="settings-language">{tc('language')}</FieldLabel>
        <NativeSelect id="settings-language" className="w-full" value={locale} onChange={(e) => setLocale(e.target.value as SupportedLocale)}>
          {supportedLocales.map((l) => (
            <NativeSelectOption key={l} value={l}>
              {tc(`languageNames.${l}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>{t('languageHelp')}</FieldDescription>
      </Field>
      <Field>
        <FieldTitle>{tc('theme')}</FieldTitle>
        <ToggleGroup
          variant="outline"
          spacing={0}
          aria-label={tc('theme')}
          value={[choice]}
          onValueChange={(value) => {
            const next = value[0] as ThemeChoice | undefined;
            if (next) setTheme(next);
          }}
        >
          {THEMES.map(({ id, icon: Icon }) => (
            <ToggleGroupItem key={id} value={id} className="px-3">
              <Icon />
              {tc(`themeNames.${id}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>{t('themeHelp')}</FieldDescription>
      </Field>
    </div>
  );
}

/** Settings saved in the project. */
function ProjectSettings() {
  const t = useTranslations('dialogs.settings');
  const tc = useTranslations('common');
  const project = useStore((s) => s.project)!;
  const toast = useStore((s) => s.toast);
  const s = project.settings;
  const nsError = !NAMESPACE_PATTERN.test(project.namespace)
    ? t('namespaceInvalid')
    : project.namespace === 'minecraft'
      ? t('namespaceMinecraft')
      : null;
  const packNameError = /^[A-Za-z0-9_.-]+$/.test(s.packName) ? null : t('packNameInvalid');

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="settings-project-name">{t('projectName')}</FieldLabel>
          <Input id="settings-project-name" value={project.name} onChange={(e) => updateProjectSettings((p) => (p.name = e.target.value))} />
        </Field>
        <Field>
          <FieldLabel htmlFor="settings-mc-version">{t('minecraftVersion')}</FieldLabel>
          <NativeSelect
            id="settings-mc-version"
            className="w-full"
            value={s.minecraftVersion}
            onChange={(e) => updateProjectSettings((p) => (p.settings.minecraftVersion = e.target.value))}
          >
            {MC_VERSIONS.map((v) => (
              <NativeSelectOption key={v.id} value={v.id}>
                {v.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>{t('minecraftVersionHelp')}</FieldDescription>
        </Field>
        <Field data-invalid={!!nsError}>
          <FieldLabel htmlFor="settings-namespace">{t('namespace')}</FieldLabel>
          <Input
            id="settings-namespace"
            className="font-mono"
            aria-invalid={!!nsError}
            value={project.namespace}
            onChange={(e) => updateProjectSettings((p) => (p.namespace = e.target.value.toLowerCase()))}
          />
          {nsError ? <FieldError>{nsError}</FieldError> : <FieldDescription>{t('namespaceHelp', { namespace: project.namespace })}</FieldDescription>}
        </Field>
        <Field data-invalid={!!packNameError}>
          <FieldLabel htmlFor="settings-pack-name">{t('packName')}</FieldLabel>
          <Input
            id="settings-pack-name"
            className="font-mono"
            aria-invalid={!!packNameError}
            value={s.packName}
            onChange={(e) => updateProjectSettings((p) => (p.settings.packName = e.target.value))}
          />
          {packNameError ? (
            <FieldError>{packNameError}</FieldError>
          ) : (
            <FieldDescription className="font-mono text-xs">plugins/Nexo/pack/external_packs/{s.packName}</FieldDescription>
          )}
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="settings-pack-description">{t('packDescription')}</FieldLabel>
          <Input
            id="settings-pack-description"
            value={s.packDescription}
            onChange={(e) => updateProjectSettings((p) => (p.settings.packDescription = e.target.value))}
          />
        </Field>
      </div>

      <Field>
        <FieldTitle>{t('packIcon')}</FieldTitle>
        <div className="flex max-w-[420px] gap-3 rounded-md border border-border bg-muted/40 p-3">
          <div className="grid size-16 flex-none place-items-center overflow-hidden rounded-sm bg-background">
            {s.packIcon ? (
              <img src={s.packIcon} alt="" className="max-h-full max-w-full [image-rendering:pixelated]" />
            ) : (
              <ImageUp className="size-[22px] text-muted-foreground" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <span className="text-xs text-muted-foreground">{t('packIconHint')}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const [file] = await pickFiles('.png,image/png', false);
                  if (!file) return;
                  const dataUrl = await readAsDataUrl(file);
                  if (!readPngInfoFromDataUrl(dataUrl)) {
                    toast('error', t('invalidPng'));
                    return;
                  }
                  updateProjectSettings((p) => (p.settings.packIcon = dataUrl));
                }}
              >
                <ImageUp /> {s.packIcon ? t('replace') : t('upload')}
              </Button>
              {s.packIcon && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => updateProjectSettings((p) => (p.settings.packIcon = null))}>
                  <Trash2 /> {tc('remove')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Field>

      <Field orientation="horizontal">
        <Checkbox
          id="settings-use-item-model"
          checked={s.useItemModel}
          onCheckedChange={(checked) => updateProjectSettings((p) => (p.settings.useItemModel = checked))}
        />
        <FieldContent>
          <FieldLabel htmlFor="settings-use-item-model">{t('useItemModel')}</FieldLabel>
          <FieldDescription>{t.rich('useItemModelHelp', { ...richTags, component: 'Components.item_model: nexo:<item_id>' })}</FieldDescription>
        </FieldContent>
      </Field>
    </div>
  );
}
