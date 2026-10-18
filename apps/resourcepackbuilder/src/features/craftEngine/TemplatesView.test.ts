/** The default templates reference: grouping by kind and search by id or argument. */
import { describe, expect, it } from 'vitest';
import { CE_DEFAULT_TEMPLATES } from '@resourcepackbuilder/core/craftEngine';
import { defaultTemplateGroup, groupDefaultTemplates } from './TemplatesView';

describe('default templates reference', () => {
  it('groups templates by the first part of their path', () => {
    expect(defaultTemplateGroup('default:hardness/stone')).toBe('hardness');
    expect(defaultTemplateGroup('default:rotatable_block')).toBe('rotatable_block');
    const groups = groupDefaultTemplates(CE_DEFAULT_TEMPLATES, '').map(([group]) => group);
    expect(groups.slice(0, 2)).toEqual(['settings', 'hardness']);
    expect(groups).toContain('loot_table');
    expect(new Set(groups).size).toBe(groups.length);
  });

  it('finds templates by id or argument name', () => {
    const byId = groupDefaultTemplates(CE_DEFAULT_TEMPLATES, 'DEEPSLATE_ore');
    expect(byId.flatMap(([, templates]) => templates.map((template) => template.id))).toEqual(['default:settings/deepslate_ore']);
    const byArgument = groupDefaultTemplates(CE_DEFAULT_TEMPLATES, 'break_power').flatMap(([, templates]) => templates);
    expect(byArgument.length).toBeGreaterThan(0);
    expect(byArgument.every((template) => template.required?.includes('break_power') || template.optional?.includes('break_power'))).toBe(
      true,
    );
    expect(groupDefaultTemplates(CE_DEFAULT_TEMPLATES, 'no such template')).toEqual([]);
  });
});
