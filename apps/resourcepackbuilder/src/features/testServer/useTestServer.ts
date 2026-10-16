import { useErrorMessage } from '../../i18n/errors';
import type { TestServerConfigPatch } from '../../platform/desktopApi';
import { useServices } from '../../services/bootstrap';
import type { TestServerSync } from '../../services/testServerSync';
import { notify } from '../../shell/notify';

/** The test server service; the test server page is only shown with it (desktop program). */
export function useTestServer(): TestServerSync {
  const testServer = useServices().testServer;
  if (!testServer) throw new Error('The test server is only available in the desktop program');
  return testServer;
}

/** Saves test server settings; a failure is shown as error toast (the service has restored the saved state). */
export function useSetConfig(): (patch: TestServerConfigPatch) => void {
  const testServer = useTestServer();
  const errorMessage = useErrorMessage();
  return (patch) => {
    testServer.setConfig(patch).catch((err: unknown) => notify('error', errorMessage(err)));
  };
}
