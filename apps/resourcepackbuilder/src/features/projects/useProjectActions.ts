/** Project actions offered in several places (top bar, welcome screen, projects dialog), with their notices. */
import { useTranslations } from 'next-intl';
import { pickFiles, readAsText } from '@resourcepackbuilder/ui';
import { PROJECT_FILE_EXTENSION } from '@resourcepackbuilder/core/project/projectFile';
import {
  closeProject,
  createNewProject,
  deleteStoredProject,
  openProjectFile,
  openSharedProject,
  openStoredProject,
  saveProjectFile,
} from '../../commands/projects';
import { useErrorMessage } from '../../i18n/errors';
import { useServices } from '../../services/bootstrap';
import { confirm } from '../../store/dialogs';
import { notify } from '../../shell/notify';
import { getProject } from '../../store/project';

export function useProjectActions() {
  const services = useServices();
  const t = useTranslations('app');
  const tProjectList = useTranslations('layout.projectList');
  const errorMessage = useErrorMessage();

  const report = (err: unknown) => notify('error', errorMessage(err));

  return {
    isShareAvailable: services.share !== null,

    async create(name: string, namespace: string, minecraftVersion: string) {
      const project = await createNewProject(services, name.trim() || t('defaults.newProjectName'), namespace.trim(), minecraftVersion);
      notify('success', t('project.created', { name: project.name }));
    },

    async open(id: string) {
      try {
        if (!(await openStoredProject(services, id))) notify('error', t('project.loadFailed'));
      } catch (err) {
        report(err);
      }
    },

    /** Asks, then deletes the stored project; resolves with whether it was deleted. */
    async remove(project: { id: string; name: string }): Promise<boolean> {
      const confirmed = await confirm({
        title: tProjectList('deleteTitle'),
        message: tProjectList('deleteMessage', { name: project.name }),
        confirmLabel: tProjectList('deleteConfirm'),
        destructive: true,
      });
      if (!confirmed) return false;
      try {
        await deleteStoredProject(services, project.id);
        return true;
      } catch (err) {
        report(err);
        return false;
      }
    },

    async close() {
      await closeProject(services);
    },

    saveFile() {
      const project = getProject();
      if (!project) return;
      saveProjectFile(project);
      notify('success', t('project.fileSaved'));
    },

    async openFile() {
      const [file] = await pickFiles(`${PROJECT_FILE_EXTENSION},.json`, false);
      if (!file) return;
      try {
        const project = await openProjectFile(services, await readAsText(file), {
          confirmReplace: (fromFile) =>
            confirm({
              title: tProjectList('replaceTitle'),
              message: tProjectList('replaceMessage', { name: fromFile.name }),
              confirmLabel: tProjectList('replaceConfirm'),
              destructive: true,
            }),
          copyName: (name) => t('defaults.importedName', { name }),
        });
        if (project) notify('success', t('project.opened', { name: project.name }));
      } catch (err) {
        report(err);
      }
    },

    /** Resolves with whether a shared project was opened. */
    async openShared(): Promise<boolean> {
      try {
        const project = await openSharedProject(services, {
          fallbackUserName: t('defaults.unknownUser'),
          confirmReplace: (stored) =>
            confirm({
              title: tProjectList('replaceSharedTitle'),
              message: tProjectList('replaceSharedMessage', { name: stored.name }),
              confirmLabel: tProjectList('replaceConfirm'),
              destructive: true,
            }),
        });
        if (project) notify('success', t('project.sharedOpened', { name: project.name }));
        return project !== null;
      } catch (err) {
        report(err);
        return false;
      }
    },
  };
}
