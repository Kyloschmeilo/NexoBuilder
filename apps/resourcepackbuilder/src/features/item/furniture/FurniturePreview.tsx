/**
 * 3D previews of furniture: one variant of a CraftEngine furniture (its display elements with their transforms,
 * hitboxes and seats), the entity renderer of a CraftEngine block's state (its elements in the block's outline) and a
 * Nexo furniture (the item's model with its display properties, hitboxes and seats).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  craftEngineItemKey,
  type FurnitureElementPose,
  furnitureElementPose,
  furnitureHitboxBox,
  hitboxSeats,
  rendererElementPose,
  rendererElements,
  variantList,
  type Vec3,
} from '@resourcepackbuilder/core/craftEngine';
import { type NexoHitbox, nexoHitboxEntries, parseNexoHitbox, parseNexoSeat } from '@resourcepackbuilder/core/nexo';
import type { Item, Project } from '@resourcepackbuilder/core/project';
import type { DisplaySlot, ImportedModel } from '@resourcepackbuilder/minecraft';
import {
  blockElementMatrix,
  buildPreviewModel,
  createStage,
  furnitureElementMatrix,
  type FurnitureElementTransform,
  type FurnitureScene,
  type FurnitureSceneElement,
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
 * The scene elements of display elements, placed in the furniture's frame or the block's. Item displays and dropped
 * items show the model of the item they name (the furniture's or block's own item when they name none), if the
 * project has it; other elements and items of other packs are placeholder blocks. Dropped items (`item`) are shown at
 * their position in the model's ground slot, without bobbing.
 */
function sceneElements(
  project: Project,
  item: Item,
  poses: FurnitureElementPose[],
  matrixOf: (transform: FurnitureElementTransform) => number[],
): FurnitureSceneElement[] {
  const ownKey = craftEngineItemKey(project, item);
  const modelOf = (key: string) => Object.values(project.items).find((other) => craftEngineItemKey(project, other) === key)?.model ?? null;
  return poses.map((pose) => {
    const showsItem = pose.type === 'item_display' || pose.type === 'item';
    const model = showsItem ? modelOf(pose.item ?? ownKey) : null;
    if (pose.type === 'item') {
      const matrix = matrixOf({
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
      matrix: matrixOf({ ...pose, flip: pose.type === 'item_display' }),
      display,
    };
  });
}

/** The scene of a furniture variant. */
function furnitureScene(project: Project, item: Item, variant: Record<string, unknown>): FurnitureScene {
  const poses = variantList(variant, 'elements').map((element) => furnitureElementPose(element));
  const hitboxes = variantList(variant, 'hitboxes');
  return {
    elements: sceneElements(project, item, poses, furnitureElementMatrix),
    hitboxes: hitboxes.map(furnitureHitboxBox),
    seats: hitboxes.flatMap((hitbox) => hitboxSeats(hitbox).map((seat) => seat.position)),
  };
}

/** The outline of the block, in the furniture frame the scene's boxes are in (the block on the middle grid block). */
const BLOCK_OUTLINE: { min: Vec3; max: Vec3 } = { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] };

/** The scene of a block state's entity renderer, with the block's outline. */
function rendererScene(project: Project, item: Item, state: Record<string, unknown>): FurnitureScene {
  const poses = rendererElements(state).map(rendererElementPose);
  return { elements: sceneElements(project, item, poses, blockElementMatrix), hitboxes: [BLOCK_OUTLINE], seats: [] };
}

/** A vector `x,y,z` of a Nexo display property, or `fallback`. */
function nexoVector(value: unknown, fallback: Vec3): Vec3 {
  const parts = typeof value === 'string' ? value.split(',').map((part) => Number(part.trim())) : [];
  return parts.length === 3 && parts.every(Number.isFinite) ? (parts as Vec3) : fallback;
}

/** The space a Nexo hitbox takes, in the furniture's frame (blocks, standing on the furniture's block). */
function nexoHitboxBox(hitbox: NexoHitbox): { min: Vec3; max: Vec3 } {
  const cube = ([x, y, z]: Vec3, width: number, height = width) => ({
    min: [x - width / 2, y, z - width / 2] as Vec3,
    max: [x + width / 2, y + height, z + width / 2] as Vec3,
  });
  switch (hitbox.kind) {
    case 'barriers':
      // Barrier blocks fill whole blocks from `from` to `to`
      return {
        min: [hitbox.from[0] - 0.5, hitbox.from[1], hitbox.from[2] - 0.5],
        max: [hitbox.to[0] + 0.5, hitbox.to[1] + 1, hitbox.to[2] + 0.5],
      };
    case 'interactions':
      return cube(hitbox.position, hitbox.width ?? 1, hitbox.height ?? 1);
    case 'shulkers':
      return cube(hitbox.position, hitbox.scale);
    case 'ghasts':
      // A happy ghast is 4 blocks wide at scale 1 (0.25 = one block)
      return cube(hitbox.position, 4 * hitbox.scale);
  }
}

/**
 * The scene of a Nexo furniture: the item's model as an item display at the block's center with the furniture's
 * `properties` (translation, scale, display transform; rotations are left out), its hitboxes and its seats.
 */
function nexoFurnitureScene(item: Item, furniture: Record<string, unknown>): FurnitureScene {
  const properties = (furniture.properties ?? {}) as Record<string, unknown>;
  const transform = typeof properties.display_transform === 'string' ? properties.display_transform.toLowerCase() : 'none';
  const model = item.model;
  const matrix = furnitureElementMatrix({
    position: [0, 0.5, 0],
    translation: nexoVector(properties.translation, [0, 0, 0]),
    scale: nexoVector(properties.scale, [1, 1, 1]),
    rotation: [0, 0, 0, 1],
    yaw: 0,
    pitch: 0,
    flip: true,
  });
  const hitboxes = nexoHitboxEntries(furniture.hitbox)
    .map((entry) => parseNexoHitbox(entry.kind, entry.text))
    .filter((hitbox): hitbox is NexoHitbox => hitbox !== null);
  const seats = (Array.isArray(furniture.seats) ? furniture.seats : [furniture.seats]).map(parseNexoSeat).filter((seat) => seat !== null);
  return {
    elements: [
      {
        model: model && previewModel(model),
        matrix,
        display: transform === 'none' ? undefined : model?.json.display?.[transform as DisplaySlot],
      },
    ],
    hitboxes: hitboxes.map(nexoHitboxBox),
    seats: seats.map((seat) => seat.position),
  };
}

/** A stage showing `scene`; the camera is framed on it when `frameKey` changes or the view is reset. */
function ScenePreview({ scene, frameKey, height }: { scene: FurnitureScene; frameKey: string; height: number }) {
  const t = useTranslations('preview');
  const stageRef = useRef<Stage | null>(null);
  const [resetCounter, setResetCounter] = useState(0);
  const [isWebglUnavailable, setIsWebglUnavailable] = useState(false);
  const framedFor = useRef<string | null>(null);

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
    const key = `${frameKey}|${resetCounter}`;
    const frame = framedFor.current !== key;
    framedFor.current = key;
    return showFurniture(stage, scene, frame);
  }, [scene, frameKey, resetCounter]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface-sunken" style={{ height }}>
      <div ref={attachStage} className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full" />
      {isWebglUnavailable ? (
        <div className="absolute inset-0 grid place-items-center bg-surface-sunken p-5 text-center text-label text-text-muted">
          {t('webglUnavailable')}
        </div>
      ) : (
        <div className="absolute top-2 right-2">
          <IconButton label={t('resetView')} variant="outline" className="bg-surface" onClick={() => setResetCounter((c) => c + 1)}>
            <RotateCcw />
          </IconButton>
        </div>
      )}
    </div>
  );
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
  const scene = useMemo(() => furnitureScene(project, item, variant), [project, item, variant]);
  return <ScenePreview scene={scene} frameKey={variantName} height={height} />;
}

/** The preview of the entity renderer of `state` (named `stateName`, framed again when it changes). */
export function BlockRendererPreview({
  project,
  item,
  stateName,
  state,
  height = 260,
}: {
  project: Project;
  item: Item;
  stateName: string;
  state: Record<string, unknown>;
  height?: number;
}) {
  const scene = useMemo(() => rendererScene(project, item, state), [project, item, state]);
  return <ScenePreview scene={scene} frameKey={stateName} height={height} />;
}

/** The preview of a Nexo furniture (`furniture` is the item's `Mechanics.furniture`). */
export function NexoFurniturePreview({
  item,
  furniture,
  height = 280,
}: {
  item: Item;
  furniture: Record<string, unknown>;
  height?: number;
}) {
  const scene = useMemo(() => nexoFurnitureScene(item, furniture), [item, furniture]);
  return <ScenePreview scene={scene} frameKey={item.id} height={height} />;
}
