import { createContext, useContext, type ReactNode } from 'react';

/** Texts that the components speak to assistive technology only (close buttons, spinners). */
export interface UiLabels {
  /** The close button of a dialog. */
  close: string;
  /** The close button of a toast. */
  closeToast: string;
  /** A spinner without a label of its own. */
  loading: string;
}

/** English labels, used outside a {@link UiLabelsProvider}. */
const DEFAULT_UI_LABELS: UiLabels = { close: 'Close', closeToast: 'Close toast', loading: 'Loading' };

const UiLabelsContext = createContext<UiLabels>(DEFAULT_UI_LABELS);

/** Gives the components below it the accessible labels in the app's language. */
export function UiLabelsProvider({ labels, children }: { labels: UiLabels; children: ReactNode }) {
  return <UiLabelsContext.Provider value={labels}>{children}</UiLabelsContext.Provider>;
}

/** The accessible labels of the nearest {@link UiLabelsProvider}, English without one. */
export function useUiLabels(): UiLabels {
  return useContext(UiLabelsContext);
}
