/**
 * Runs an async job one at a time and coalesces requests: a request made while the job runs schedules exactly one
 * more run after it, shared by every request made in the meantime (their arguments are merged).
 *
 * Every caller's promise settles with a run that started after its request, so it always reflects the state at (or
 * after) the time of the request.
 */
export interface SerialTask<A, R> {
  run(arg: A): Promise<R>;
  /** Resolves once nothing is running or queued. */
  idle(): Promise<void>;
}

interface Waiter<R> {
  resolve: (value: R) => void;
  reject: (reason: unknown) => void;
}

export function createSerialTask<A = void, R = void>(
  job: (arg: A) => Promise<R>,
  merge: (queued: A, next: A) => A = (_, next) => next,
): SerialTask<A, R> {
  let running: Promise<R> | null = null;
  let queued: { arg: A; waiters: Waiter<R>[] } | null = null;

  const start = (arg: A): Promise<R> => {
    const current = job(arg);
    running = current;
    const startQueued = () => {
      running = null;
      const next = queued;
      queued = null;
      if (!next) return;
      start(next.arg).then(
        (value) => next.waiters.forEach((w) => w.resolve(value)),
        (reason: unknown) => next.waiters.forEach((w) => w.reject(reason)),
      );
    };
    current.then(startQueued, startQueued);
    return current;
  };

  return {
    run(arg) {
      if (!running) return start(arg);
      const next = queued ? { arg: merge(queued.arg, arg), waiters: queued.waiters } : { arg, waiters: [] };
      queued = next;
      return new Promise<R>((resolve, reject) => next.waiters.push({ resolve, reject }));
    },
    async idle() {
      while (running) await running.catch(() => undefined);
    },
  };
}
