import { describe, expect, it } from 'vitest';
import { createProject } from '../project/factory';
import { createDialog } from '../project/media/dialog';
import { addMediaEntry } from '../project/media/operations';
import { nexoProjectSuggestions } from './suggestions';

describe('nexoProjectSuggestions', () => {
  it('offers the Carpentry block types only with the addon', () => {
    const project = createProject('Test', 'pack');
    expect(nexoProjectSuggestions(project).carpentryBlockTypes).toEqual([]);
    project.settings.carpentryAddon = true;
    expect(nexoProjectSuggestions(project).carpentryBlockTypes.map((option) => option.value)).toEqual([
      'STAIR',
      'SLAB',
      'DOOR',
      'TRAPDOOR',
      'GRATE',
      'CHAIN',
      'LANTERN',
      'BARS',
    ]);
  });

  it('suggests the keys of the dialogs and the multipack template ids', () => {
    const project = createProject('Test', 'pack');
    addMediaEntry(project, 'dialog', 'Welcome', createDialog);
    project.settings.multipack = { templates: { music: {}, tools_3d: {} } };
    const suggestions = nexoProjectSuggestions(project);
    expect(suggestions.dialogs).toEqual([{ value: 'nexo:welcome' }]);
    expect(suggestions.multipackTemplates).toEqual([{ value: 'music' }, { value: 'tools_3d' }]);
  });
});
