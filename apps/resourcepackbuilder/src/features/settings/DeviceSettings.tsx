/** Language: stored on this device, not in the project. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { SUPPORTED_LOCALES } from '@resourcepackbuilder/i18n';
import { Field, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { setLocale, useLocaleStore } from '../../i18n/locale';
import { isOneOf } from '../../lib/isOneOf';

/** The language choice of this device. */
export function DeviceSettings() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  const languageId = useId();
  const locale = useLocaleStore((s) => s.locale);
  return (
    <div className="grid gap-4 @xl/settings:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={languageId}>{tCommon('language')}</FieldLabel>
        <NativeSelect
          id={languageId}
          className="w-full"
          value={locale}
          onChange={(e) => {
            const next = e.target.value;
            if (isOneOf(SUPPORTED_LOCALES, next)) setLocale(next);
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
    </div>
  );
}
