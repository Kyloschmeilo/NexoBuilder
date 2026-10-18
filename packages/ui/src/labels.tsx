import { createContext, useContext, type ReactNode } from 'react';

/**
 * Texts the generic components show or speak themselves (close buttons, spinners, the controls of the editor
 * primitives). The app passes them translated through {@link UiLabelsProvider}; texts that depend on the content
 * (field labels, button captions such as "Add recipe") are props of the components instead.
 */
export interface UiLabels {
  /** The close button of a dialog. */
  close: string;
  /** The close button of a toast. */
  closeToast: string;
  /** A spinner without a label of its own. */
  loading: string;
  /** Tooltip of a Nexo docs link, followed by `: <topic>` when the link names one. */
  docsNexo: string;
  /** Tooltip of a CraftEngine wiki link, followed by `: <topic>` when the link names one. */
  docsCraftEngine: string;
  /** The ⓘ button that opens a help popover. */
  moreInfo: string;
  /** The disclosure that holds the fields few items need, followed by the count in brackets. */
  moreOptions: string;
  /** The `⋯` menu of a page header. */
  moreActions: string;
  /** The button that clears a field back to the plugin's default. */
  resetToDefault: string;
  /** The navigation between the sections of a page. */
  sections: string;
  /** The drag handle of a list row (arrow keys move the row too). */
  dragToReorder: string;
  /** Moves a list row one place up. */
  moveUp: string;
  /** Moves a list row one place down. */
  moveDown: string;
  /** Inserts a copy of a list row below it. */
  duplicate: string;
  /** Removes a list row or map entry. */
  remove: string;
  /** Closes the editor dialog of a list row. */
  done: string;
  /** Default header of the key column of a map. */
  key: string;
  /** Default header of the value column of a map. */
  value: string;
  /** Default caption of the button that adds a map entry. */
  addEntry: string;
  /** Shown when a new or renamed map key is already in use. */
  keyTaken: string;
}

/** English labels, used outside a {@link UiLabelsProvider}. */
export const DEFAULT_UI_LABELS: UiLabels = {
  close: 'Close',
  closeToast: 'Close toast',
  loading: 'Loading',
  docsNexo: 'Open Nexo docs',
  docsCraftEngine: 'Open CraftEngine wiki',
  moreInfo: 'More information',
  moreOptions: 'More options',
  moreActions: 'More actions',
  resetToDefault: 'Reset to default',
  sections: 'Sections',
  dragToReorder: 'Drag to reorder (or use the arrow keys)',
  moveUp: 'Move up',
  moveDown: 'Move down',
  duplicate: 'Duplicate',
  remove: 'Remove',
  done: 'Done',
  key: 'Key',
  value: 'Value',
  addEntry: 'Add entry',
  keyTaken: 'This key already exists.',
};

const UiLabelsContext = createContext<UiLabels>(DEFAULT_UI_LABELS);

/** Gives the components below it the labels in the app's language. */
export function UiLabelsProvider({ labels, children }: { labels: UiLabels; children: ReactNode }) {
  return <UiLabelsContext.Provider value={labels}>{children}</UiLabelsContext.Provider>;
}

/** The labels of the nearest {@link UiLabelsProvider}, English without one. */
export function useUiLabels(): UiLabels {
  return useContext(UiLabelsContext);
}
