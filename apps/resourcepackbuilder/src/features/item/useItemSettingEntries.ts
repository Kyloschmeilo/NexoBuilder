/** The open item's settings as command palette entries (see `settingsPalette.ts`). */
import { useTranslations } from 'next-intl';
import { formFor } from '@resourcepackbuilder/core/targets';
import { useSchemaText } from '../../components/useSchemaText';
import { useProjectStore } from '../../store/project';
import { openPaletteSetting, paletteSettings } from './settingsPalette';

/** One setting as the palette shows it. */
export interface ItemSettingEntry {
  id: string;
  label: string;
  /** "Added · Components" or "Add · Mechanics" */
  detail: string;
  /** Label, YAML key and aliases */
  keywords: string[];
  run: () => void;
}

/** The palette group of the item `itemId`'s settings; null without an open item. */
export function useItemSettingEntries(itemId: string | null): { heading: string; entries: ItemSettingEntry[] } | null {
  const t = useTranslations('item');
  const text = useSchemaText();
  const project = useProjectStore((s) => s.project);
  const item = itemId ? project?.items[itemId] : undefined;
  if (!project || !item) return null;
  const entries = paletteSettings(formFor(project.target), item).map((setting): ItemSettingEntry => {
    const label = text(setting.def.label);
    // Group ids come from the form at runtime; a test checks the catalogue has a title for each of them
    const group = t(`properties.titles.${setting.group}` as never);
    return {
      id: `setting:${setting.def.id}`,
      label,
      detail: setting.added ? t('palette.added', { group }) : t('palette.available', { group }),
      keywords: [label, setting.yamlKey, ...(setting.def.aliases ?? [])],
      run: () => openPaletteSetting(item.id, setting),
    };
  });
  return { heading: t('palette.group'), entries };
}
