/** The shading of a model as field rows: ambient occlusion (whole model) and shade (per cube), like in Blockbench. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { ImportedModel } from '@resourcepackbuilder/minecraft';
import { FieldRow } from '@resourcepackbuilder/ui';
import { Switch } from '@resourcepackbuilder/ui/components/switch';
import { updateItemModel } from '../../../commands/items';

/** `ambientocclusion` and `shade`; shade is a switch for all cubes that names how many are off when only some are. */
export function ShadingOptions({ itemId, model }: { itemId: string; model: ImportedModel }) {
  const t = useTranslations('item');
  const occlusionId = useId();
  const shadeId = useId();
  const elements = model.json.elements ?? [];
  const unshaded = elements.filter((el) => el.shade === false).length;
  const shadeState = unshaded === 0 ? 'all' : unshaded === elements.length ? 'none' : 'some';
  const usesOverride = elements.some((el) => el.shade_direction_override !== undefined);

  const setAmbientOcclusion = (on: boolean) =>
    updateItemModel(itemId, (m) => {
      if (on) delete m.json.ambientocclusion;
      else m.json.ambientocclusion = false;
    });
  const setShade = (on: boolean) =>
    updateItemModel(itemId, (m) => {
      for (const el of m.json.elements ?? []) {
        if (on) delete el.shade;
        else el.shade = false;
      }
    });

  return (
    <>
      <FieldRow label={t('model.ambientOcclusion')} htmlFor={occlusionId} yamlKey="ambientocclusion" help={t('model.ambientOcclusionHelp')}>
        <div className="flex min-h-7.5 items-center">
          <Switch id={occlusionId} checked={model.json.ambientocclusion !== false} onCheckedChange={setAmbientOcclusion} />
        </div>
      </FieldRow>
      {elements.length > 0 && (
        <FieldRow
          label={t('model.shade')}
          htmlFor={shadeId}
          yamlKey="shade"
          help={t('model.shadeHelp')}
          warning={usesOverride ? t('model.shadeOverride') : undefined}
        >
          <div className="flex min-h-7.5 items-center gap-2.5">
            <Switch id={shadeId} checked={shadeState === 'all'} disabled={usesOverride} onCheckedChange={setShade} />
            {shadeState === 'some' && (
              <span className="text-meta text-text-muted">{t('model.shadeOff', { off: unshaded, total: elements.length })}</span>
            )}
          </div>
        </FieldRow>
      )}
    </>
  );
}
