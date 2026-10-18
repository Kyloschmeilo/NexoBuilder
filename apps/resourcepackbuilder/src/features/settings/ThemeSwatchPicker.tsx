/** A radio list of the colour themes, each with its name, a short description and four colour chips of its palette. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { COLOR_THEMES, type ColorTheme } from '../../theme/colorThemes';

/** The chips of a swatch: canvas, raised surface, accent and text of the theme. */
const CHIP_CLASSES = ['bg-canvas', 'bg-surface-raised', 'bg-primary', 'bg-text'] as const;

/**
 * The colours of one theme in the current light or dark mode. The chips read the theme's tokens through a scoped
 * `data-color-theme`, so they always match the stylesheet.
 */
export function ThemeSwatch({ theme, className }: { theme: ColorTheme; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-color-theme={theme}
      className={cn('flex shrink-0 overflow-hidden rounded-(--radius-control) border border-line', className)}
    >
      {CHIP_CLASSES.map((chip) => (
        <span key={chip} className={cn('h-6 w-3.5', chip)} />
      ))}
    </span>
  );
}

/** Picks one of the colour themes; arrow keys move between them like any radio group. */
export function ThemeSwatchPicker({
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: {
  value: ColorTheme;
  onChange: (theme: ColorTheme) => void;
  'aria-label'?: string;
  className?: string;
}) {
  const t = useTranslations('dialogs.settings.colorThemes');
  const name = useId();
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2', className)}>
      {COLOR_THEMES.map((theme) => (
        <label
          key={theme}
          data-testid={`color-theme-${theme}`}
          className={cn(
            'flex items-center gap-3 rounded-(--radius-control) border border-line bg-surface px-2.5 py-2 transition-colors hover:border-line-strong',
            'has-checked:border-primary has-checked:bg-accent-soft has-focus-visible:ring-2 has-focus-visible:ring-ring',
          )}
        >
          <input type="radio" name={name} value={theme} checked={value === theme} onChange={() => onChange(theme)} className="sr-only" />
          <ThemeSwatch theme={theme} />
          <span className="flex min-w-0 flex-col">
            <span className="text-label font-medium text-text">{t(`${theme}.name`)}</span>
            <span className="text-meta text-text-muted">{t(`${theme}.description`)}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
