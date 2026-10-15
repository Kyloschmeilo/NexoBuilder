import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TooltipProvider } from '@resourcepackbuilder/ui/components/tooltip';
import { I18nProvider } from '../i18n/I18nProvider';
import { bootstrap, type AppServices } from '../services/bootstrap';
import { ServicesContext } from '../services/servicesContext';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AppShell } from './AppShell';

type BootState = { kind: 'booting' } | { kind: 'ready'; services: AppServices } | { kind: 'failed'; error: unknown };

function BootFailed({ error }: { error: unknown }) {
  const t = useTranslations('layout.boot');
  return (
    <div role="alert" className="grid h-screen place-items-center bg-background p-8 text-center text-foreground">
      <div className="max-w-md">
        <h1 className="font-heading text-xl font-semibold tracking-wide uppercase">{t('failedTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
      </div>
    </div>
  );
}

/** Starts the background services, then renders the app with every provider it needs. */
export default function Root() {
  const [boot, setBoot] = useState<BootState>({ kind: 'booting' });

  useEffect(() => {
    let isCancelled = false;
    let services: AppServices | null = null;
    bootstrap().then(
      (started) => {
        services = started;
        if (isCancelled) started.dispose();
        else setBoot({ kind: 'ready', services: started });
      },
      (error: unknown) => {
        if (!isCancelled) setBoot({ kind: 'failed', error });
      },
    );
    return () => {
      isCancelled = true;
      services?.dispose();
    };
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider>
          {boot.kind === 'ready' && (
            <ServicesContext.Provider value={boot.services}>
              <AppShell />
            </ServicesContext.Provider>
          )}
          {boot.kind === 'failed' && <BootFailed error={boot.error} />}
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
