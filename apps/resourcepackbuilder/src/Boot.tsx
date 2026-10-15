import { useEffect, useState } from 'react';
import { TooltipProvider } from '@resourcepackbuilder/ui/components/tooltip';
import App from './App';
import { I18nProvider } from './i18n/I18nProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import { useStore } from './state/store';
import { getLastProjectId, loadProject, startAutosave } from './state/persistence';
import { startShareController } from './state/share';
import { startTestServerController } from './state/testserver';

async function boot() {
  try {
    const lastId = await getLastProjectId();
    if (lastId) {
      const project = await loadProject(lastId);
      if (project) useStore.getState().setProject(project);
    }
  } catch (err) {
    console.warn('Could not load the last project', err);
  }
  startAutosave();
  startShareController();
  startTestServerController();
}

// Module-level so the controllers start exactly once, even when StrictMode mounts twice.
let booting: Promise<void> | null = null;

export default function Boot() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void (booting ??= boot()).then(() => setReady(true));
  }, []);
  return (
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider>{ready ? <App /> : null}</TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
