import { useTranslations } from 'next-intl';
import type { ExportMode } from '@resourcepackbuilder/core/export/types';
import { planMultiExport, type ExportEntry } from '@resourcepackbuilder/core/export/selection';
import { buildMultiExportZip } from '@resourcepackbuilder/core/export/zip';
import { downloadBytes } from '@resourcepackbuilder/ui';
import { useErrorMessage } from '../../i18n/errors';
import { notify } from '../../shell/notify';

/** Returns the function that builds the ZIP and starts its download; it resolves with whether that worked. */
export function useRunExport() {
  const t = useTranslations('dialogs.export');
  const errorMessage = useErrorMessage();
  return async (entries: ExportEntry[], mode: ExportMode): Promise<boolean> => {
    if (entries.length === 0) return false;
    try {
      const result = await buildMultiExportZip(planMultiExport(entries, { includeBinaries: true }), mode);
      downloadBytes(result.data, result.fileName, 'application/zip');
      notify('success', t('created', { file: result.fileName, count: result.paths.length }));
      return true;
    } catch (err) {
      console.error(err);
      notify('error', t('failed', { error: errorMessage(err) }));
      return false;
    }
  };
}
