import { useState } from 'react';
import { useErrorMessage } from '../../i18n/errors';
import type { TestServerConfigPatch } from '../../platform/desktopApi';
import { useServices } from '../../services/servicesContext';
import type { TestServerSync } from '../../services/testServerSync';
import { notify } from '../../shell/notify';

/** The test server service; the test server page is only shown with it (desktop program). */
export function useTestServer(): TestServerSync {
  const testServer = useServices().testServer;
  if (!testServer) throw new Error('The test server is only available in the desktop program');
  return testServer;
}

/** Runs server actions one at a time: `isBusy` while one runs, failures as error notice, optional success notice. */
export function useBusyAction() {
  const errorMessage = useErrorMessage();
  const [isBusy, setIsBusy] = useState(false);
  const run = async (action: () => Promise<unknown>, success?: string) => {
    setIsBusy(true);
    try {
      await action();
      if (success) notify('success', success);
    } catch (err) {
      notify('error', errorMessage(err));
    } finally {
      setIsBusy(false);
    }
  };
  return { isBusy, run };
}

/** Saves test server settings; a failure is shown as error toast (the service has restored the saved state). */
export function useSetConfig(): (patch: TestServerConfigPatch) => void {
  const testServer = useTestServer();
  const errorMessage = useErrorMessage();
  return (patch) => {
    testServer.setConfig(patch).catch((err: unknown) => notify('error', errorMessage(err)));
  };
}
