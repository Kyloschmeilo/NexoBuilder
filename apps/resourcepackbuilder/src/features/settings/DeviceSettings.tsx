/** Language: stored on this device, not in the project. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { SUPPORTED_LOCALES } from '@resourcepackbuilder/i18n';
import { FieldRow } from '@resourcepackbuilder/ui';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { setLocale, useLocaleStore } from '../../i18n/locale';
import { isOneOf } from '../../lib/isOneOf';

/** The language select of this device, used by the settings page and the welcome screen's appearance menu. */
export function LanguageSelect({ id, className }: { id?: string; className?: string }) {
  const t = useTranslations('common');
  const locale = useLocaleStore((s) => s.locale);
  return (
    <NativeSelect
      id={id}
      className={className}
      value={locale}
      onChange={(e) => {
        const next = e.target.value;
        if (isOneOf(SUPPORTED_LOCALES, next)) setLocale(next);
      }}
    >
      {SUPPORTED_LOCALES.map((l) => (
        <NativeSelectOption key={l} value={l}>
          {t(`languageNames.${l}`)}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/** The language choice of this device. */
export function DeviceSettings() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  const languageId = useId();
  return (
    <FieldRow label={tCommon('language')} htmlFor={languageId} help={t('languageHelp')}>
      <LanguageSelect id={languageId} className="w-full" />
    </FieldRow>
  );
}
