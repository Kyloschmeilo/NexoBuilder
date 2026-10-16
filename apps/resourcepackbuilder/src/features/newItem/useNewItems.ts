import { useEffect, useEffectEvent, useReducer } from 'react';
import { useTranslations } from 'next-intl';
import {
  initialNewItemState,
  isCreationBlocked,
  newItemEntries,
  newItemInputs,
  newItemReducer,
} from '@resourcepackbuilder/core/project/newItems';
import type { NewItemInput } from '@resourcepackbuilder/core/project/factory';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { useErrorMessage } from '../../i18n/errors';
import { notify } from '../../shell/notify';
import { readImportFiles } from '../../components/modelFiles';

/**
 * The dialog's state with its actions: files are read (also those it was opened with), turned into drafts, and the
 * entered values are checked. `inputs(folderId)` gives what to create, or null while something blocks it.
 */
export function useNewItems(project: Project, initialFiles: File[] | undefined) {
  const t = useTranslations('dialogs.newItem');
  const errorMessage = useErrorMessage();
  const [state, dispatch] = useReducer(newItemReducer, Boolean(initialFiles?.length), initialNewItemState);

  const read = (files: File[]) =>
    readImportFiles(files).then(
      (loaded) => dispatch({ type: 'filesRead', files: loaded }),
      (err: unknown) => {
        dispatch({ type: 'readFailed' });
        notify('error', t('readFailed', { error: errorMessage(err) }));
      },
    );

  // The files the dialog was opened with (its props never change while it is open)
  const readInitialFiles = useEffectEvent((files: File[]) => void read(files));
  useEffect(() => {
    if (initialFiles?.length) readInitialFiles(initialFiles);
  }, [initialFiles]);

  const entries = newItemEntries(project, state);
  const isBlocked = isCreationBlocked(entries);

  return {
    state,
    dispatch,
    entries,
    isReading: state.pendingReads > 0,
    addFiles(files: File[]) {
      dispatch({ type: 'readStarted' });
      void read(files);
    },
    inputs: (folderId: string): NewItemInput[] | null => (isBlocked ? null : newItemInputs(entries, folderId)),
  };
}
