/** The project-level CraftEngine sections as the project stores them: read leniently from stored data. */
import { describe, expect, it } from 'vitest';
import { migrateProject } from '../project/migrate';
import { craftEngineServerTranslations, invalidLocales } from './lang';

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
