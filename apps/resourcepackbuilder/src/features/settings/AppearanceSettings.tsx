/** Colour theme and light, dark or system mode: stored on this device, not in the project. */
import { useTranslations } from 'next-intl';
import { FieldGroup, FieldRow, SegmentedControl } from '@resourcepackbuilder/ui';
import { useColorTheme } from '../../theme/useColorTheme';
import { THEME_CHOICES, useThemeChoice } from '../../theme/useThemeChoice';
import { ThemeSwatchPicker } from './ThemeSwatchPicker';

/** The light, dark or system choice as a segmented control (settings page and the welcome screen's menu). */
export function ModeControl({ size }: { size?: 'sm' | 'default' }) {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  const { choice, setChoice } = useThemeChoice();
  return (
    <SegmentedControl
      aria-label={t('mode')}
      size={size}
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
  );
}

/** The appearance rows: a swatch picker for the colour theme and the light/dark/system choice. */
export function AppearanceSettings() {
  const t = useTranslations('dialogs.settings');
  const { colorTheme, setColorTheme } = useColorTheme();
  return (
    <FieldGroup>
      <FieldRow label={t('colorTheme')} help={t('colorThemeHelp')} layout="stacked">
        <ThemeSwatchPicker aria-label={t('colorTheme')} value={colorTheme} onChange={setColorTheme} />
      </FieldRow>
      <FieldRow label={t('mode')} help={t('themeHelp')}>
        <div>
          <ModeControl />
        </div>
      </FieldRow>
    </FieldGroup>
  );
}
