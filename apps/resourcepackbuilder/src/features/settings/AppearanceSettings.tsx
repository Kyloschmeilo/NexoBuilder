/** Colour theme and light, dark or system mode: stored on this device, not in the project. */
import { useTranslations } from 'next-intl';
import { SegmentedControl } from '@resourcepackbuilder/ui';
import { Field, FieldDescription, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { useColorTheme } from '../../theme/useColorTheme';
import { THEME_CHOICES, useThemeChoice } from '../../theme/useThemeChoice';
import { ThemeSwatchPicker } from './ThemeSwatchPicker';

/** The appearance block: a swatch picker for the colour theme and the light/dark/system choice. */
export function AppearanceSettings() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  const { colorTheme, setColorTheme } = useColorTheme();
  const { choice, setChoice } = useThemeChoice();
  return (
    <div className="grid gap-4">
      <Field>
        <FieldTitle>{t('colorTheme')}</FieldTitle>
        <ThemeSwatchPicker aria-label={t('colorTheme')} value={colorTheme} onChange={setColorTheme} />
        <FieldDescription>{t('colorThemeHelp')}</FieldDescription>
      </Field>
      <Field>
        <FieldTitle>{t('mode')}</FieldTitle>
        <div>
          <SegmentedControl
            aria-label={t('mode')}
            value={choice}
            options={THEME_CHOICES.map(({ id, icon: Icon }) => ({
              value: id,
              label: (
                <>
                  <Icon />
                  {tCommon(`themeNames.${id}`)}
                </>
              ),
            }))}
            onChange={setChoice}
          />
        </div>
        <FieldDescription>{t('themeHelp')}</FieldDescription>
      </Field>
    </div>
  );
}
