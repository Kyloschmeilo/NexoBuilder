import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IconButton } from '@resourcepackbuilder/ui';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import type { ImportedModel, JavaDisplayTransform } from '@resourcepackbuilder/core/model/types';
import { buildPreviewModel } from './modelGeometry';
import { createStage, type Stage } from './stage';
import { createModelObject } from './threeModel';

/** Display slots that can be previewed; labels live in the `preview.display` messages. */
const DISPLAY_OPTIONS = ['none', 'gui', 'thirdperson_righthand', 'firstperson_righthand', 'head', 'ground', 'fixed'] as const;
type DisplayOption = (typeof DISPLAY_OPTIONS)[number];

const isDisplayOption = (value: string): value is DisplayOption => (DISPLAY_OPTIONS as readonly string[]).includes(value);

/** Ground grid and block outline (one block = 16 pixels). */
function createBlockHelpers(): { object: THREE.Object3D; dispose: () => void } {
  const group = new THREE.Group();
  const grid = new THREE.GridHelper(16, 16, 0x54766a, 0x1f302a);
  grid.position.y = -8;
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x54766a, transparent: true, opacity: 0.6 });
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(16, 16, 16)), outlineMaterial);
  group.add(grid, outline);
  return {
    object: group,
    dispose: () => {
      grid.dispose();
      outline.geometry.dispose();
      outlineMaterial.dispose();
    },
  };
}

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
  const displayTransform = display === 'none' ? undefined : (model.json.display?.[display] as JavaDisplayTransform | undefined);

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
    if (!stage || preview.kind === 'empty') return;
    const object = createModelObject(preview, displayTransform, stage.render);
    const helpers = !displayTransform && preview.kind === 'elements' ? createBlockHelpers() : null;
    stage.scene.add(object.root);
    if (helpers) stage.scene.add(helpers.object);

    const box = new THREE.Box3().setFromObject(object.root);
    if (box.isEmpty()) box.set(new THREE.Vector3(-8, -8, -8), new THREE.Vector3(8, 8, 8));
    const direction = preview.kind === 'generated' && !displayTransform ? new THREE.Vector3(0, 0.12, 1) : new THREE.Vector3(1, 0.75, 1.15);
    stage.frame(box, direction);

    return () => {
      stage.scene.remove(object.root);
      object.dispose();
      if (helpers) {
        stage.scene.remove(helpers.object);
        helpers.dispose();
      }
      stage.render();
    };
  }, [preview, displayTransform, resetCounter]);

  const hasDisplay = (slot: DisplayOption) => slot === 'none' || !!model.json.display?.[slot];

  const note = isWebglUnavailable
    ? t('webglUnavailable')
    : preview.kind === 'empty' && preview.note
      ? t(`notes.${preview.note.code}`, preview.note.params)
      : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-background" style={{ height }}>
      <div ref={attachStage} className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full" />
      {note && <div className="absolute inset-0 grid place-items-center bg-background p-5 text-center text-[13px] text-muted-foreground">{note}</div>}
      {showToolbar && !note && (
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-center gap-1.5 [&>*]:pointer-events-auto">
          <NativeSelect
            size="sm"
            className="max-w-[220px] bg-card [&_select]:text-xs"
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
          <IconButton label={t('resetView')} variant="outline" className="bg-card" onClick={() => setResetCounter((c) => c + 1)}>
            <RotateCcw />
          </IconButton>
        </div>
      )}
    </div>
  );
}
