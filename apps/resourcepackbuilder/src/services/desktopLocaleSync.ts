/** Keeps the desktop program's menus, native dialogs and test-server messages in the app's language. */
import type { DesktopAppApi } from '../platform/desktopApi';
import { useLocaleStore } from '../i18n/locale';

export function startDesktopLocaleSync(api: DesktopAppApi): () => void {
  const apply = (locale: string) => void api.setLocale(locale).catch(() => undefined);
  apply(useLocaleStore.getState().locale);
  return useLocaleStore.subscribe((state, prev) => {
    if (state.locale !== prev.locale) apply(state.locale);
  });
}
