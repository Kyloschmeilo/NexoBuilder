/** Language and appearance: stored on this device, not in the project. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { SUPPORTED_LOCALES } from '@resourcepackbuilder/i18n';
import { Field, FieldDescription, FieldLabel, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { ToggleGroup, ToggleGroupItem } from '@resourcepackbuilder/ui/components/toggle-group';
import { setLocale, useLocaleStore } from '../../i18n/locale';
import { THEME_CHOICES } from '../../theme/choices';
import { isThemeChoice } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeProvider';

export function DeviceSettings() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  const languageId = useId();
  const locale = useLocaleStore((s) => s.locale);
  const { choice, setTheme } = useTheme();
  return (
    <div className="grid gap-4 @xl/dialog:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={languageId}>{tCommon('language')}</FieldLabel>
        <NativeSelect
          id={languageId}
          className="w-full"
          value={locale}
          onChange={(e) => {
            const next = SUPPORTED_LOCALES.find((l) => l === e.target.value);
            if (next) setLocale(next);
          }}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <NativeSelectOption key={l} value={l}>
              {tCommon(`languageNames.${l}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>{t('languageHelp')}</FieldDescription>
      </Field>
      <Field>
        <FieldTitle>{tCommon('theme')}</FieldTitle>
        <ToggleGroup
          variant="outline"
          spacing={0}
          aria-label={tCommon('theme')}
          value={[choice]}
          onValueChange={([next]) => {
            if (isThemeChoice(next)) setTheme(next);
          }}
        >
          {THEME_CHOICES.map(({ id, icon: Icon }) => (
            <ToggleGroupItem key={id} value={id} className="px-3">
              <Icon />
              {tCommon(`themeNames.${id}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>{t('themeHelp')}</FieldDescription>
      </Field>
    </div>
  );
}
