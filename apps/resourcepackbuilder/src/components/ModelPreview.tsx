/** Interactive 3D preview of an imported model: the React frame (display slot select, reset, notes) around the preview package. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IconButton } from '@resourcepackbuilder/ui';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import type { DisplaySlot, ImportedModel } from '@resourcepackbuilder/minecraft';
import { buildPreviewModel, createStage, showModel, type Stage } from '@resourcepackbuilder/preview';

/** Display slots that can be previewed (a choice of minecraft's DISPLAY_SLOTS); labels live in the `preview.display` messages. */
const DISPLAY_OPTIONS = [
  'none',
  'gui',
  'thirdperson_righthand',
  'firstperson_righthand',
  'head',
  'ground',
  'fixed',
] as const satisfies ReadonlyArray<'none' | DisplaySlot>;
type DisplayOption = (typeof DISPLAY_OPTIONS)[number];

const isDisplayOption = (value: string): value is DisplayOption => (DISPLAY_OPTIONS as readonly string[]).includes(value);

export interface ModelPreviewProps {
  model: ImportedModel;
  /** Height in pixels. */
  height?: number;
  /** Display-slot select and reset button. */
  showToolbar?: boolean;
}

/** Interactive 3D preview of an imported model (orbit with the mouse, optional display slots). */
export function ModelPreview({ model, height = 340, showToolbar = true }: ModelPreviewProps) {
  const t = useTranslations('preview');
  const stageRef = useRef<Stage | null>(null);
  const [display, setDisplay] = useState<DisplayOption>('none');
  const [resetCounter, setResetCounter] = useState(0);
  const [isWebglUnavailable, setIsWebglUnavailable] = useState(false);
  const preview = useMemo(() => buildPreviewModel(model), [model]);
  const displayTransform = display === 'none' ? undefined : model.json.display?.[display];

  // The stage lives as long as its container element (created before the effects below run)
  const attachStage = useCallback((container: HTMLDivElement) => {
    try {
      stageRef.current = createStage(container);
    } catch {
      setIsWebglUnavailable(true);
      return;
    }
    return () => {
      stageRef.current?.dispose();
      stageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    return showModel(stage, preview, displayTransform);
  }, [preview, displayTransform, resetCounter]);

  const hasDisplay = (slot: DisplayOption) => slot === 'none' || !!model.json.display?.[slot];

  const note = isWebglUnavailable
    ? t('webglUnavailable')
    : preview.kind === 'empty' && preview.note
      ? t(`notes.${preview.note.code}`, preview.note.args)
      : null;

  return (
    <div data-slot="model-preview" className="relative overflow-hidden rounded-lg border border-line bg-surface-sunken" style={{ height }}>
      <div ref={attachStage} className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full" />
      {note && (
        <div className="absolute inset-0 grid place-items-center bg-surface-sunken p-5 text-center text-label text-text-muted">{note}</div>
      )}
      {showToolbar && !note && (
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-center gap-1.5 [&>*]:pointer-events-auto">
          <NativeSelect
            size="sm"
            className="max-w-[220px] bg-surface [&_select]:text-meta"
            value={display}
            onChange={(e) => {
              if (isDisplayOption(e.target.value)) setDisplay(e.target.value);
            }}
            title={t('display.label')}
            aria-label={t('display.label')}
          >
            {DISPLAY_OPTIONS.map((slot) => (
              <NativeSelectOption key={slot} value={slot} disabled={!hasDisplay(slot)}>
                {hasDisplay(slot) ? t(`display.${slot}`) : t('display.notDefined', { label: t(`display.${slot}`) })}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <span className="flex-1" />
          <IconButton label={t('resetView')} variant="outline" className="bg-surface" onClick={() => setResetCounter((c) => c + 1)}>
            <RotateCcw />
          </IconButton>
        </div>
      )}
    </div>
  );
}
