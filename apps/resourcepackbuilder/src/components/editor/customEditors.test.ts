import { describe, expect, it } from 'vitest';
import { NEXO_FURNITURE_EDITORS } from '@resourcepackbuilder/core/nexo';
import { customFieldEditor } from './customEditors';
import './FieldRenderer';

describe('hand-written field editors', () => {
  it('are registered once the field renderer is loaded', () => {
    for (const name of Object.values(NEXO_FURNITURE_EDITORS)) expect(customFieldEditor(name)).toBeDefined();
    expect(customFieldEditor('unknown')).toBeUndefined();
  });
});
