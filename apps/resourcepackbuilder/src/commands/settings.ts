/** Project-wide settings (name, namespace, pack options …). */
import type { Project } from '@resourcepackbuilder/core/project';
import { mutate } from '../store/project';

export function updateProjectSettings(recipe: (project: Project) => void): void {
  mutate(recipe, 'settings');
}
