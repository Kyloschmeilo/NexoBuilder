import { useState } from 'react';
import { useErrorMessage } from '../i18n/errors';
import { notify } from '../shell/notify';

/**
 * Runs async actions one at a time: `isBusy` while one runs, failures as error notice, an optional success
 * notice (fixed, or worded from the result). `run` resolves with the action's result, or `undefined` when it failed.
 */
export function useBusyAction() {
  const errorMessage = useErrorMessage();
  const [isBusy, setIsBusy] = useState(false);
  const run = async <T>(action: () => Promise<T>, success?: string | ((result: T) => string | undefined)): Promise<T | undefined> => {
    setIsBusy(true);
    try {
      const result = await action();
      const message = typeof success === 'function' ? success(result) : success;
      if (message) notify('success', message);
      return result;
    } catch (err) {
      notify('error', errorMessage(err));
      return undefined;
    } finally {
      setIsBusy(false);
    }
  };
  return { isBusy, run };
}
