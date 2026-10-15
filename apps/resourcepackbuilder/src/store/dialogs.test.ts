import { afterEach, describe, expect, it } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project/factory';
import { setProject } from './project';
import { closeDialog, confirm, openDialog, prompt, useDialogStore } from './dialogs';

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

afterEach(() => {
  useDialogStore.setState({ questions: [], feature: null });
  setProject(null);
});

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
  it('opens one at a time and closes', () => {
    setProject(createProject('Test', 'test'));
    openDialog({ id: 'moveItem', props: { itemId: 'i_1' } });
    openDialog({ id: 'export', props: {} });
    expect(useDialogStore.getState().feature).toEqual({ id: 'export', props: {} });
    closeDialog();
    expect(useDialogStore.getState().feature).toBeNull();
  });

  it('opens a project dialog only while a project is open', () => {
    openDialog({ id: 'settings', props: {} });
    expect(useDialogStore.getState().feature).toBeNull();
    openDialog({ id: 'projects', props: { tab: 'open' } });
    expect(useDialogStore.getState().feature?.id).toBe('projects');
  });

  it('closes a project dialog when another project is opened, but keeps the projects dialog', () => {
    setProject(createProject('A', 'a'));
    openDialog({ id: 'settings', props: {} });
    setProject(createProject('B', 'b'));
    expect(useDialogStore.getState().feature).toBeNull();

    openDialog({ id: 'projects', props: { tab: 'open' } });
    setProject(null);
    expect(useDialogStore.getState().feature?.id).toBe('projects');
  });
});
