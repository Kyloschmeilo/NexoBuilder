/** Turning dropped or picked files into models for an existing item, with notices for what could not be used. */
import { useTranslations } from 'next-intl';
import { createDrafts } from '@resourcepackbuilder/core/model/drafts';
import type { ImportedModel } from '@resourcepackbuilder/core/model/types';
import { useErrorMessage } from '../../../i18n/errors';
import { notify } from '../../../shell/notify';
import { readImportFiles } from '../../../components/modelFiles';

export function useModelImport() {
  const t = useTranslations('item');
  const errorMessage = useErrorMessage();

  return {
    /** All files together form one model (e.g. JSON + its textures); further models are ignored with a warning. */
    async importModel(files: File[]): Promise<ImportedModel | null> {
      const drafts = createDrafts(await readImportFiles(files), 'combined');
      const [draft] = drafts;
      if (!draft) {
        notify('error', t('model.noMatchingFile'));
        return null;
      }
      if (!draft.model) {
        notify('error', draft.error ? errorMessage(draft.error) : t('model.unreadable'));
        return null;
      }
      if (drafts.length > 1) notify('warning', t('model.onlyFirst'));
      return draft.model;
    },

    /** Each file (or each .bbmodel) becomes its own model, in natural file-name order. */
    async importModels(files: File[]): Promise<ImportedModel[]> {
      const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const drafts = createDrafts(await readImportFiles(sorted), 'separate');
      if (drafts.length === 0) notify('error', t('model.noMatchingFile'));
      const models: ImportedModel[] = [];
      for (const draft of drafts) {
        if (draft.model) models.push(draft.model);
        else notify('error', draft.error ? errorMessage(draft.error) : t('model.fileUnreadable', { name: draft.name }));
      }
      return models;
    },
  };
}
