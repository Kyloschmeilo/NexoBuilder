import { describe, expect, it } from 'vitest';
import { createProject } from './factory';
import { summarizeProject } from './summary';

describe('summarizeProject', () => {
  it('carries the target of the project', () => {
    expect(summarizeProject(createProject('A')).target).toBe('nexo');
    expect(summarizeProject(createProject('B', undefined, undefined, 'craftengine')).target).toBe('craftengine');
  });
});
