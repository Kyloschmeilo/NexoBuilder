/**
 * The IPC contract between the renderer and the Electron main process lives in `@resourcepackbuilder/desktop-contract`
 * (shared with the main process and the preload script); this file re-exports its types for the UI.
 */
import type { DesktopApi } from '@resourcepackbuilder/desktop-contract';

export type * from '@resourcepackbuilder/desktop-contract';

declare global {
  interface Window {
    /** Present only inside the desktop app. */
    resourcepackBuilder?: DesktopApi;
  }
}
