import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { useStore } from './state/store';
import { getLastProjectId, loadProject, startAutosave } from './state/persistence';
import { startShareController } from './state/share';

async function boot() {
  try {
    const lastId = await getLastProjectId();
    if (lastId) {
      const project = await loadProject(lastId);
      if (project) useStore.getState().setProject(project);
    }
  } catch (err) {
    console.warn('Letztes Projekt konnte nicht geladen werden', err);
  }
  startAutosave();
  startShareController();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
