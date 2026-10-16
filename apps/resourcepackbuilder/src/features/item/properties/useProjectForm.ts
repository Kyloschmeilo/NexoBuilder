import type { FormSchema } from '@resourcepackbuilder/core/form';
import { formFor } from '@resourcepackbuilder/core/targets';
import { useOpenProject } from '../../../store/project';

/** The item editor's form for the open project's pack target. */
export function useProjectForm(): FormSchema {
  return formFor(useOpenProject().target);
}
