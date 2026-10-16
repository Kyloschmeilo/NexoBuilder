import { Circle, CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert, type LucideIcon } from 'lucide-react';

/** The visual state of something: drives the colour of dots and badges. */
export type Tone = 'neutral' | 'info' | 'busy' | 'success' | 'warning' | 'error';

/** The one icon per tone (toasts, issue lists, check summaries). */
export const TONE_ICONS: Record<Tone, LucideIcon> = {
  neutral: Circle,
  info: Info,
  busy: LoaderCircle,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
};

/** Text (and icon) colour per tone. */
export const TONE_TEXT_CLASS: Record<Tone, string> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  busy: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

/** Badge variant per tone. */
export const TONE_BADGE_VARIANT = {
  neutral: 'secondary',
  info: 'info',
  busy: 'info',
  success: 'success',
  warning: 'warning',
  error: 'destructive',
} as const satisfies Record<Tone, string>;

/** Alert variant per tone. */
export const TONE_ALERT_VARIANT = {
  neutral: 'default',
  info: 'info',
  busy: 'info',
  success: 'default',
  warning: 'warning',
  error: 'destructive',
} as const satisfies Record<Tone, string>;
