/** 3D preview of one variant of a CraftEngine furniture: its elements with their transforms, hitboxes and seats. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  craftEngineItemKey,
  furnitureElementPose,
  furnitureHitboxBox,
  hitboxSeats,
  variantList,
} from '@resourcepackbuilder/core/craftEngine';
import type { Item, Project } from '@resourcepackbuilder/core/project';
import type { DisplaySlot, ImportedModel } from '@resourcepackbuilder/minecraft';
import {
  buildPreviewModel,
  createStage,
  furnitureElementMatrix,
  type FurnitureScene,
  type PreviewModel,
  showFurniture,
  type Stage,
} from '@resourcepackbuilder/preview';
import { IconButton } from '@resourcepackbuilder/ui';

/** Preview models by imported model (edits of other parts of the project keep them). */
const previewModels = new WeakMap<ImportedModel, PreviewModel>();
function previewModel(model: ImportedModel): PreviewModel {
  let preview = previewModels.get(model);
  if (!preview) previewModels.set(model, (preview = buildPreviewModel(model)));
  return preview;
}

/** CraftEngine's display transform name as the model's display slot (`third_person_right_hand` → `thirdperson_righthand`). */
const displaySlot = (transform: string) => transform.replace('_person_', 'person_').replace(/_hand$/, 'hand') as DisplaySlot;

/**
 * The scene of a variant. Item displays and dropped items show the model of the item they name (the furniture's own
 * item when they name none), if the project has it; other elements and items of other packs are placeholder blocks.
 * Dropped items (`item`) are shown at their position in the model's ground slot, without bobbing.
 */
function furnitureScene(project: Project, item: Item, variant: Record<string, unknown>): FurnitureScene {
  const ownKey = craftEngineItemKey(project, item);
  const modelOf = (key: string) =>
    Object.values(project.items).find((other) => craftEngineItemKey(project, other) === key)?.model ?? null;
  const elements = variantList(variant, 'elements').map((element) => {
    const pose = furnitureElementPose(element);
    const showsItem = pose.type === 'item_display' || pose.type === 'item';
    const model = showsItem ? modelOf(pose.item ?? ownKey) : null;
    if (pose.type === 'item') {
      const matrix = furnitureElementMatrix({
        position: pose.position,
        translation: [0, 0, 0],
        scale: [1, 1, 1],
        rotation: [0, 0, 0, 1],
        yaw: 0,
        pitch: 0,
        flip: false,
      });
      return { model: model && previewModel(model), matrix, display: model?.json.display?.ground };
    }
    const display = pose.displayTransform === 'none' ? undefined : model?.json.display?.[displaySlot(pose.displayTransform)];
    return {
      model: model && previewModel(model),
      matrix: furnitureElementMatrix({ ...pose, flip: pose.type === 'item_display' }),
      display,
    };
  });
  const hitboxes = variantList(variant, 'hitboxes');
  return {
    elements,
    hitboxes: hitboxes.map(furnitureHitboxBox),
    seats: hitboxes.flatMap((hitbox) => hitboxSeats(hitbox).map((seat) => seat.position)),
  };
}

/** The preview of `variant`; the camera is framed on it when the variant name changes or the view is reset. */
export function FurniturePreview({
  project,
  item,
  variantName,
  variant,
  height = 300,
}: {
  project: Project;
  item: Item;
  variantName: string;
  variant: Record<string, unknown>;
  height?: number;
}) {
  const t = useTranslations('preview');
  const stageRef = useRef<Stage | null>(null);
  const [resetCounter, setResetCounter] = useState(0);
  const [isWebglUnavailable, setIsWebglUnavailable] = useState(false);
  const framedFor = useRef<string | null>(null);
  const scene = useMemo(() => furnitureScene(project, item, variant), [project, item, variant]);

  const attachStage = useCallback((container: HTMLDivElement) => {
    try {
      stageRef.current = createStage(container);
      // A new stage (also after React's dev remount) has its camera at the origin until it is framed
      framedFor.current = null;
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
    const frameKey = `${variantName}|${resetCounter}`;
    const frame = framedFor.current !== frameKey;
    framedFor.current = frameKey;
    return showFurniture(stage, scene, frame);
  }, [scene, variantName, resetCounter]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-background" style={{ height }}>
      <div ref={attachStage} className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full" />
      {isWebglUnavailable ? (
        <div className="absolute inset-0 grid place-items-center bg-background p-5 text-center text-[13px] text-muted-foreground">
          {t('webglUnavailable')}
        </div>
      ) : (
        <div className="absolute top-2 right-2">
          <IconButton label={t('resetView')} variant="outline" className="bg-card" onClick={() => setResetCounter((c) => c + 1)}>
            <RotateCcw />
          </IconButton>
        </div>
      )}
    </div>
  );
}
