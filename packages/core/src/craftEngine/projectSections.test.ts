/** The project-level CraftEngine sections as the project stores them: read leniently from stored data. */
import { describe, expect, it } from 'vitest';
import { createProject } from '../project/factory';
import { migrateProject } from '../project/migrate';
import { craftEngineServerTranslations, invalidLocales } from './lang';
import { CE_SCRIPT_PATH, projectScriptOptions } from './scripts';

describe('project translations', () => {
  it('reads stored lang keys and translations leniently', () => {
    const migrated = migrateProject({
      name: 'Burg',
      target: 'craftengine',
      craftEngine: { lang: { en_us: { a: 'A', b: 5 }, bad: 3 }, translations: { en: { x: 'X' } } },
    });
    expect(migrated.craftEngine).toEqual({ lang: { en_us: { a: 'A' } }, translations: { en: { x: 'X' } } });
  });

  it('writes the translations with a readable locale and at least one key', () => {
    const project = { craftEngine: { translations: { en: { ' a ': 'A' }, de: {}, 'EN-us': { b: 'B' } } } };
    expect(craftEngineServerTranslations(project)).toEqual({ en: { a: 'A' } });
    expect(invalidLocales(project.craftEngine.translations)).toEqual(['EN-us']);
  });
});

describe('project scripts', () => {
  it('accepts folder paths but no . or .. segment, and suggests only valid scripts', () => {
    for (const path of ['combo', 'utils/math', 'a.b/c-d_e']) expect(CE_SCRIPT_PATH.test(path), path).toBe(true);
    for (const path of ['..', '.', '../x', 'a/../b', 'a/./b', 'a/..', 'a//b', '/a', 'A'])
      expect(CE_SCRIPT_PATH.test(path), path).toBe(false);
    const project = createProject('Burg', 'burg', '1.21.11', 'craftengine');
    project.craftEngine = {
      scripts: [
        { path: 'ok', source: 'x' },
        { path: 'a/../b', source: 'x' },
      ],
    };
    expect(projectScriptOptions(project)).toEqual([{ value: 'burg:ok' }]);
  });
});
