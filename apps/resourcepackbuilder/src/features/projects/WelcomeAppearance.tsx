/**
 * The appearance menu of the welcome screen: colour theme, light or dark, and language. Without an open project the
 * settings page is not reachable, so these device settings are offered here too.
 */
import { useId } from 'react';
import { Palette } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@resourcepackbuilder/ui/components/popover';
import { ModeControl } from '../settings/AppearanceSettings';
import { LanguageSelect } from '../settings/DeviceSettings';
import { ThemeSwatchPicker } from '../settings/ThemeSwatchPicker';
import { useColorTheme } from '../../theme/useColorTheme';

/** A ghost "Appearance" button opening a popover with the device's theme, mode and language. */
export function WelcomeAppearance() {
  const t = useTranslations('dialogs.settings');
  const tCommon = useTranslations('common');
  const languageId = useId();
  const { colorTheme, setColorTheme } = useColorTheme();
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="sm" data-testid="welcome-appearance" />}>
        <Palette /> {t('sections.appearance.title')}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-3 rounded-(--radius-overlay) bg-surface p-3 shadow-(--shadow-overlay) ring-0">
        <div className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-text-muted">{t('colorTheme')}</span>
          <ThemeSwatchPicker compact aria-label={t('colorTheme')} value={colorTheme} onChange={setColorTheme} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-text-muted">{t('mode')}</span>
          <ModeControl size="sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={languageId} className="text-meta font-semibold text-text-muted">
            {tCommon('language')}
          </label>
          <LanguageSelect id={languageId} className="w-full" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
