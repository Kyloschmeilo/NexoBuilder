import { afterEach, describe, expect, it } from 'vitest';
import { createProject } from '@resourcepackbuilder/core/project';
import { updateProjectSettings } from '../commands/settings';
import { getProject, mutate, setProject } from './project';

describe('mutate', () => {
  afterEach(() => setProject(null));

  it('accepts recipes that return the assigned value', () => {
    setProject(createProject('Old name'));
    updateProjectSettings((project) => (project.name = 'New name'));
    expect(getProject()?.name).toBe('New name');
  });

  it('keeps the project when the recipe changes nothing', () => {
    const project = createProject('Same');
    setProject(project);
    mutate(() => undefined);
    expect(getProject()).toBe(project);
  });
});
