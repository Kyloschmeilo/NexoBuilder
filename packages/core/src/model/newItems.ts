/**
 * State of the "New item" dialog as a reducer: the dropped files, the drafts built from them and the name, ID and
 * material entered per draft (or for one item without a model).
 */
import { DEFAULT_MATERIAL } from '../nexo/material';
import type { NewItemInput } from '../project/factory';
import { validateNewItemIds, type ItemIdError } from '../project/ids';
import type { Project } from '../project/types';
import { slugify, stripFormatting } from '../text';
import { createDrafts, unsupportedFiles, type ImportDraft, type PngMode } from './drafts';
import type { ImportFile } from './types';

/** What the user enters for one new item. */
export interface ItemMeta {
  displayName: string;
  nexoId: string;
  /** Once the ID was edited by hand, it no longer follows the display name */
  isIdEdited: boolean;
  material: string;
}

export type MetaPatch = Partial<Pick<ItemMeta, 'displayName' | 'nexoId' | 'material'>>;

export interface NewItemState {
  files: ImportFile[];
  pngMode: PngMode;
  drafts: ImportDraft[];
  /** Entered values per draft, by {@link sourceKey}, so they survive rebuilding the drafts */
  metaBySource: Record<string, ItemMeta>;
  /** Entered values of the item without a model */
  plainMeta: ItemMeta;
  isWithoutModel: boolean;
  /** Number of file reads still running */
  pendingReads: number;
}

export type NewItemAction =
  | { type: 'readStarted' }
  | { type: 'filesRead'; files: ImportFile[] }
  | { type: 'readFailed' }
  | { type: 'pngModeChanged'; pngMode: PngMode }
  | { type: 'withoutModelChanged'; isWithoutModel: boolean }
  /** `sourceKey` null: the item without a model */
  | { type: 'metaChanged'; sourceKey: string | null; patch: MetaPatch }
  | { type: 'draftChanged'; draft: ImportDraft }
  | { type: 'draftRemoved'; draftKey: string };

/** Stable key of a draft (kind and main file), so its entered values are kept when the drafts are rebuilt. */
export function sourceKey(draft: ImportDraft): string {
  return `${draft.kind}:${draft.files[0]?.name ?? draft.key}`;
}

function newMeta(displayName: string): ItemMeta {
  return { displayName, nexoId: displayName && slugify(stripFormatting(displayName)), isIdEdited: false, material: DEFAULT_MATERIAL };
}

/** Applies entered values; the ID follows the display name until it is edited by hand. */
function patchMeta(meta: ItemMeta, patch: MetaPatch): ItemMeta {
  const next = { ...meta, ...patch };
  if (patch.nexoId !== undefined) next.isIdEdited = true;
  else if (patch.displayName !== undefined && !meta.isIdEdited) next.nexoId = slugify(stripFormatting(patch.displayName));
  return next;
}

/** Rebuilds the drafts from `files`, keeping the values entered for drafts of the same source. */
function withDrafts(state: NewItemState, files: ImportFile[], pngMode: PngMode): NewItemState {
  const drafts = createDrafts(files, pngMode);
  const metaBySource = { ...state.metaBySource };
  for (const draft of drafts) metaBySource[sourceKey(draft)] ??= newMeta(draft.name);
  return { ...state, files, pngMode, drafts, metaBySource };
}

export function initialNewItemState(isReading: boolean): NewItemState {
  return {
    files: [],
    pngMode: 'auto',
    drafts: [],
    metaBySource: {},
    plainMeta: newMeta(''),
    isWithoutModel: false,
    pendingReads: isReading ? 1 : 0,
  };
}

export function newItemReducer(state: NewItemState, action: NewItemAction): NewItemState {
  switch (action.type) {
    case 'readStarted':
      return { ...state, pendingReads: state.pendingReads + 1 };
    case 'readFailed':
      return { ...state, pendingReads: Math.max(0, state.pendingReads - 1) };
    case 'filesRead': {
      // A file with the same name replaces the earlier one
      const files = [...state.files.filter((f) => !action.files.some((r) => r.name === f.name)), ...action.files];
      return { ...withDrafts(state, files, state.pngMode), isWithoutModel: false, pendingReads: Math.max(0, state.pendingReads - 1) };
    }
    case 'pngModeChanged':
      return withDrafts(state, state.files, action.pngMode);
    case 'withoutModelChanged':
      return { ...state, isWithoutModel: action.isWithoutModel };
    case 'metaChanged': {
      if (action.sourceKey === null) return { ...state, plainMeta: patchMeta(state.plainMeta, action.patch) };
      const meta = state.metaBySource[action.sourceKey];
      return meta ? { ...state, metaBySource: { ...state.metaBySource, [action.sourceKey]: patchMeta(meta, action.patch) } } : state;
    }
    case 'draftChanged':
      return { ...state, drafts: state.drafts.map((d) => (d.key === action.draft.key ? action.draft : d)) };
    case 'draftRemoved': {
      const removed = state.drafts.find((d) => d.key === action.draftKey);
      if (!removed) return state;
      const drafts = state.drafts.filter((d) => d !== removed);
      // Its files go too, unless another draft uses them as well (e.g. a shared texture)
      const stillUsed = new Set(drafts.flatMap((d) => d.files.map((f) => f.name)));
      const removedNames = new Set(removed.files.map((f) => f.name).filter((name) => !stillUsed.has(name)));
      const { [sourceKey(removed)]: _removedMeta, ...metaBySource } = state.metaBySource;
      return { ...state, drafts, files: state.files.filter((f) => !removedNames.has(f.name)), metaBySource };
    }
  }
}

/** Names of dropped files that cannot be imported. */
export function ignoredFileNames(state: NewItemState): string[] {
  return unsupportedFiles(state.files).map((f) => f.name);
}

/** One item the dialog will create: its draft (null without a model), what was entered and why the ID cannot be used. */
export interface NewItemEntry {
  draft: ImportDraft | null;
  meta: ItemMeta;
  idError: ItemIdError | null;
}

/** The items to create, each with its ID checked against the project and the other new items. */
export function newItemEntries(project: Project, state: NewItemState): NewItemEntry[] {
  const entries = state.isWithoutModel
    ? [{ draft: null, meta: state.plainMeta }]
    : state.drafts.flatMap((draft) => {
        const meta = state.metaBySource[sourceKey(draft)];
        return meta ? [{ draft, meta }] : [];
      });
  const idErrors = validateNewItemIds(
    project,
    entries.map((entry) => entry.meta.nexoId),
  );
  return entries.map((entry, index) => ({ ...entry, idError: idErrors[index] }));
}

/** Whether the entries cannot be created yet: none, an unusable ID or a draft without a model. */
export function isCreationBlocked(entries: NewItemEntry[]): boolean {
  return (
    entries.length === 0 || entries.some((e) => e.idError !== null || (e.draft !== null && (e.draft.error !== null || !e.draft.model)))
  );
}

/** What to create in `folderId` for the entries. */
export function newItemInputs(entries: NewItemEntry[], folderId: string): NewItemInput[] {
  return entries.map(({ draft, meta }) => ({
    displayName: meta.displayName,
    nexoId: meta.nexoId,
    folderId,
    material: meta.material || DEFAULT_MATERIAL,
    model: draft?.model ?? null,
  }));
}
