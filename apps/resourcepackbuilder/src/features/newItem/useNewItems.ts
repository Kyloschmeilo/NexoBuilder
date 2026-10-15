import { useEffect, useEffectEvent, useReducer } from 'react';
import { useTranslations } from 'next-intl';
import type { ImportDraft } from '@resourcepackbuilder/core/model/drafts';
import type { NewItemInput } from '@resourcepackbuilder/core/project/factory';
import { validateItemId } from '@resourcepackbuilder/core/project/ids';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { readLoadedFiles } from '@resourcepackbuilder/ui';
import { useErrorMessage } from '../../i18n/errors';
import { toast } from '../../store/notifications';
import { DEFAULT_MATERIAL } from '../item/itemMaterial';
import { initialNewItemState, newItemReducer, sourceKey, type ItemMeta } from './newItemState';

/** Why an entered ID cannot be used (message keys in `dialogs.newItem`). */
export type IdError = 'idRequired' | 'idInvalid' | 'idExists' | 'idDuplicate';

/** One item the dialog will create: its draft (null without a model) and what was entered for it. */
export interface NewItemEntry {
  draft: ImportDraft | null;
  meta: ItemMeta;
  idError: IdError | null;
}

/** Checks every entered ID against the project and against the other new items. */
function withIdErrors(project: Project, entries: Array<Omit<NewItemEntry, 'idError'>>): NewItemEntry[] {
  const counts = new Map<string, number>();
  for (const { meta } of entries) counts.set(meta.nexoId, (counts.get(meta.nexoId) ?? 0) + 1);
  return entries.map((entry) => {
    const error = validateItemId(project, entry.meta.nexoId);
    const idError: IdError | null = error
      ? error.kind === 'missing'
        ? 'idRequired'
        : error.kind === 'invalid'
          ? 'idInvalid'
          : 'idExists'
      : (counts.get(entry.meta.nexoId) ?? 0) > 1
        ? 'idDuplicate'
        : null;
    return { ...entry, idError };
  });
}

/**
 * The dialog's state with its actions: files are read (also those it was opened with), turned into drafts, and the
 * entered values are checked. `inputs(folderId)` gives what to create, or null while something blocks it.
 */
export function useNewItems(project: Project, initialFiles: File[] | undefined) {
  const t = useTranslations('dialogs.newItem');
  const errorMessage = useErrorMessage();
  const [state, dispatch] = useReducer(newItemReducer, Boolean(initialFiles?.length), initialNewItemState);

  const read = (files: File[]) =>
    readLoadedFiles(files).then(
      (loaded) => dispatch({ type: 'filesRead', files: loaded }),
      (err: unknown) => {
        dispatch({ type: 'readFailed' });
        toast('error', t('readFailed', { error: errorMessage(err) }));
      },
    );

  // The files the dialog was opened with (its props never change while it is open)
  const readInitialFiles = useEffectEvent((files: File[]) => void read(files));
  useEffect(() => {
    if (initialFiles?.length) readInitialFiles(initialFiles);
  }, [initialFiles]);

  const entries = withIdErrors(
    project,
    state.isWithoutModel
      ? [{ draft: null, meta: state.plainMeta }]
      : state.drafts.flatMap((draft) => {
          const meta = state.metaBySource[sourceKey(draft)];
          return meta ? [{ draft, meta }] : [];
        }),
  );
  const isBlocked =
    entries.length === 0 || entries.some((e) => e.idError !== null || (e.draft !== null && (e.draft.error !== null || !e.draft.model)));

  const inputs = (folderId: string): NewItemInput[] | null =>
    isBlocked
      ? null
      : entries.map(({ draft, meta }) => ({
          displayName: meta.displayName,
          nexoId: meta.nexoId,
          folderId,
          material: meta.material || DEFAULT_MATERIAL,
          model: draft?.model ?? null,
        }));

  return {
    state,
    dispatch,
    entries,
    isReading: state.pendingReads > 0,
    addFiles(files: File[]) {
      dispatch({ type: 'readStarted' });
      void read(files);
    },
    inputs,
  };
}
