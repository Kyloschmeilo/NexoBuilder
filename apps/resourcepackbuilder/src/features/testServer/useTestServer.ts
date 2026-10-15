import { useState } from 'react';
import { useErrorMessage } from '../../i18n/errors';
import type { TestServerConfigPatch } from '../../platform/desktopApi';
import { useServices } from '../../services/servicesContext';
import type { TestServerSync } from '../../services/testServerSync';
import { toast } from '../../store/notifications';

/** The test server service; the test server page is only shown with it (desktop program). */
export function useTestServer(): TestServerSync {
  const testServer = useServices().testServer;
  if (!testServer) throw new Error('The test server is only available in the desktop program');
  return testServer;
}

/** Runs server actions one at a time: `busy` while one runs, failures as error toast, optional success toast. */
export function useBusyAction() {
  const errorMessage = useErrorMessage();
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await action();
      if (success) toast('success', success);
    } catch (err) {
      toast('error', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

/** Saves test server settings; a failure is shown as error toast (the service has restored the saved state). */
export function useSetConfig(): (patch: TestServerConfigPatch) => void {
  const testServer = useTestServer();
  const errorMessage = useErrorMessage();
  return (patch) => {
    testServer.setConfig(patch).catch((err: unknown) => toast('error', errorMessage(err)));
  };
}
