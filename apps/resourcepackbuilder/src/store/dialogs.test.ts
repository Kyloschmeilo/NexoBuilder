import { afterEach, describe, expect, it } from 'vitest';
import type { DialogHandle } from '@resourcepackbuilder/ui/components/dialog';
import { closeProjectDialogs, confirm, isAnyDialogOpen, prompt, registerFeatureDialog, useDialogStore } from './dialogs';

const questions = () => useDialogStore.getState().questions;

function answerConfirm(index: number, value: boolean) {
  const question = questions()[index];
  if (question?.kind !== 'confirm') throw new Error('expected a confirm question');
  question.resolve(value);
}

function answerPrompt(index: number, value: string | null) {
  const question = questions()[index];
  if (question?.kind !== 'prompt') throw new Error('expected a prompt question');
  question.resolve(value);
}

const confirmOptions = { title: 'Delete?', message: 'Really?', confirmLabel: 'Delete' };

let unregister: Array<() => void> = [];

afterEach(() => {
  useDialogStore.setState({ questions: [] });
  unregister.forEach((off) => off());
  unregister = [];
});

/** A stand-in for a Base UI dialog handle whose root is mounted. */
function fakeHandle(isProjectBound: boolean) {
  const handle = {
    isOpen: false,
    close() {
      handle.isOpen = false;
    },
  };
  unregister.push(registerFeatureDialog(handle as unknown as DialogHandle<never>, isProjectBound));
  return handle;
}

describe('confirm', () => {
  it('resolves with the answer and closes the question', async () => {
    const answer = confirm(confirmOptions);
    expect(questions()).toHaveLength(1);
    answerConfirm(0, true);
    await expect(answer).resolves.toBe(true);
    expect(questions()).toHaveLength(0);
  });

  it('resolves with false when cancelled', async () => {
    const answer = confirm(confirmOptions);
    answerConfirm(0, false);
    await expect(answer).resolves.toBe(false);
  });

  it('stacks a question asked while another one is open', async () => {
    const outer = confirm(confirmOptions);
    const inner = confirm({ ...confirmOptions, title: 'Sure?' });
    expect(questions().map((q) => q.options.title)).toEqual(['Delete?', 'Sure?']);
    answerConfirm(1, true);
    await expect(inner).resolves.toBe(true);
    expect(questions().map((q) => q.options.title)).toEqual(['Delete?']);
    answerConfirm(0, false);
    await expect(outer).resolves.toBe(false);
  });
});

describe('prompt', () => {
  it('resolves with the entered value, or null when cancelled', async () => {
    const named = prompt({ title: 'Name', label: 'Name', initial: '', confirmLabel: 'OK' });
    answerPrompt(0, 'Swords');
    await expect(named).resolves.toBe('Swords');

    const cancelled = prompt({ title: 'Name', label: 'Name', initial: '', confirmLabel: 'OK' });
    answerPrompt(0, null);
    await expect(cancelled).resolves.toBeNull();
  });
});

describe('feature dialogs', () => {
  it('count as open dialogs while one of them is open', () => {
    const settings = fakeHandle(true);
    expect(isAnyDialogOpen()).toBe(false);
    settings.isOpen = true;
    expect(isAnyDialogOpen()).toBe(true);
  });

  it('closes only the dialogs that belong to the open project', () => {
    const settings = fakeHandle(true);
    const projects = fakeHandle(false);
    settings.isOpen = true;
    projects.isOpen = true;
    closeProjectDialogs();
    expect(settings.isOpen).toBe(false);
    expect(projects.isOpen).toBe(true);
  });
});
