import { describe, expect, it } from 'vitest';
import { createSerialTask } from './serialTask';

/** A promise that the test resolves by hand. */
function deferred<T = void>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('createSerialTask', () => {
  it('runs immediately when idle', async () => {
    const task = createSerialTask(async (n: number) => n * 2);
    await expect(task.run(21)).resolves.toBe(42);
  });

  it('runs one job at a time and coalesces requests made meanwhile into one more run', async () => {
    const calls: number[] = [];
    const gates = [deferred(), deferred()];
    const task = createSerialTask(async (n: number) => {
      calls.push(n);
      await gates[calls.length - 1].promise;
      return n;
    });
    const first = task.run(1);
    const second = task.run(2);
    const third = task.run(3);
    expect(calls).toEqual([1]);
    gates[0].resolve();
    await expect(first).resolves.toBe(1);
    gates[1].resolve();
    // Both waiting callers get the one run that started after their request, with the latest argument
    await expect(second).resolves.toBe(3);
    await expect(third).resolves.toBe(3);
    expect(calls).toEqual([1, 3]);
  });

  it('merges the arguments of coalesced requests', async () => {
    const seen: boolean[] = [];
    const gate = deferred();
    const task = createSerialTask(
      async (reload: boolean) => {
        seen.push(reload);
        if (seen.length === 1) await gate.promise;
      },
      (queued, next) => queued || next,
    );
    void task.run(false);
    const reloading = task.run(true);
    const plain = task.run(false);
    gate.resolve();
    await Promise.all([reloading, plain]);
    expect(seen).toEqual([false, true]);
  });

  it('passes a failure to the callers of that run and keeps going', async () => {
    let fail = true;
    const gate = deferred();
    const task = createSerialTask(async () => {
      await gate.promise;
      if (fail) {
        fail = false;
        throw new Error('boom');
      }
      return 'ok';
    });
    const first = task.run();
    const second = task.run();
    gate.resolve();
    await expect(first).rejects.toThrow('boom');
    await expect(second).resolves.toBe('ok');
  });

  it('idle() resolves once the queue is drained', async () => {
    const order: string[] = [];
    const gate = deferred();
    const task = createSerialTask(async () => {
      await gate.promise;
      order.push('run');
    });
    void task.run();
    void task.run();
    const idle = task.idle().then(() => order.push('idle'));
    gate.resolve();
    await idle;
    expect(order).toEqual(['run', 'run', 'idle']);
  });
});
