/**
 * The class-name merger every component uses. The app resolves the bare `cn` import to this module (see the app's
 * `next.config.ts` and `vitest.config.ts`), so `import { cn } from 'cn'` gets this configuration everywhere.
 *
 * It knows the Workbench type steps (`text-micro`, `text-meta`, `text-label`, `text-body`, `text-title`, `text-page`)
 * as font sizes. The default merger reads an unknown `text-*` class as a colour, so `cn('text-meta', 'text-text-muted')`
 * would drop the size; with these steps registered the two are kept, while `cn('text-meta', 'text-sm')` still keeps
 * only the later size.
 */
import { createCn } from 'cn/config';

/** The Workbench type steps, the `--text-*` sizes of styles.css. */
export const TYPE_STEPS = ['micro', 'meta', 'label', 'body', 'title', 'page'] as const;

/** `clsx` + tailwind-merge in one call, with the Workbench type steps as font sizes. */
export const cn = createCn({ extend: { classGroups: { 'font-size': [{ text: [...TYPE_STEPS] }] } } });
