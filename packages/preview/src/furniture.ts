/**
 * The furniture preview: the elements of one variant, each a model placed by its display entity transform, with the
 * hitboxes as wireframe boxes and the seats as small markers. A block's entity renderer shows the same way, with the
 * block's outline as its box.
 *
 * Values are in the furniture's own frame as CraftEngine's config writes them (blocks); the scene shows the furniture
 * as placed with yaw 180, where CraftEngine turns no offset and only mirrors z (FurniturePlacement.position). 1 block
 * is 16 units, as in the model preview.
 */
import type { JavaDisplayTransform } from '@resourcepackbuilder/minecraft';
import * as THREE from 'three';
import type { PreviewModel, Vec3 } from './modelGeometry';
import type { Stage } from './stage';
import { createModelObject } from './threeModel';

const BLOCK = 16;
/** The yaw CraftEngine places the furniture with in the preview (the player looking south) */
const PREVIEW_YAW = 180;

/** Where and how a display entity shows, in the furniture's frame (blocks and degrees). */
export interface FurnitureElementTransform {
  position: Vec3;
  translation: Vec3;
  scale: Vec3;
  /** The left rotation as a quaternion x, y, z, w */
  rotation: [number, number, number, number];
  yaw: number;
  pitch: number;
  /** Item displays turn their model half a turn around the vertical axis (vanilla's ItemDisplayRenderer) */
  flip: boolean;
}

const deg = THREE.MathUtils.degToRad;

/** A point of the furniture's frame in the scene (units of 1/16 block). */
export function furniturePoint([x, y, z]: Vec3): Vec3 {
  return [x * BLOCK, y * BLOCK, -z * BLOCK];
}

/**
 * The matrix (column-major, 16 numbers) that places an element's model (centered, in model pixels) in the scene: the
 * entity at `point` (scene units) with the yaw `yaw` and its own pitch (Display: rotationYXZ(-yaw, pitch, 0)), then
 * the display transform (translation, left rotation, scale), then the item display's half turn.
 */
function displayMatrix(point: Vec3, yaw: number, transform: FurnitureElementTransform): number[] {
  const [tx, ty, tz] = transform.translation;
  const [qx, qy, qz, qw] = transform.rotation;
  const matrix = new THREE.Matrix4()
    .makeTranslation(...point)
    .multiply(new THREE.Matrix4().makeRotationY(deg(-yaw)))
    .multiply(new THREE.Matrix4().makeRotationX(deg(transform.pitch)))
    .multiply(new THREE.Matrix4().makeTranslation(tx * BLOCK, ty * BLOCK, tz * BLOCK))
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(qx, qy, qz, qw)))
    .multiply(new THREE.Matrix4().makeScale(...transform.scale));
  if (transform.flip) matrix.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
  return matrix.toArray();
}

/** The matrix of a furniture element: the furniture placed with yaw 180, the element's yaw on top of it. */
export function furnitureElementMatrix(transform: FurnitureElementTransform): number[] {
  return displayMatrix(furniturePoint(transform.position), PREVIEW_YAW + transform.yaw, transform);
}

/**
 * The matrix of an element of a block's entity renderer: its position is in the block's frame (blocks from the
 * block's corner, as in the world), the scene centers the block on the grid's middle block; its yaw is its own.
 */
export function blockElementMatrix(transform: FurnitureElementTransform): number[] {
  const [x, y, z] = transform.position;
  return displayMatrix([(x - 0.5) * BLOCK, y * BLOCK, (z - 0.5) * BLOCK], transform.yaw, transform);
}

export interface FurnitureSceneElement {
  /** The model to show; null shows a placeholder block */
  model: PreviewModel | null;
  matrix: number[];
  /** The model's display slot the element uses (`display_transform`), if it has one */
  display?: JavaDisplayTransform;
}

export interface FurnitureScene {
  elements: FurnitureSceneElement[];
  /** Hitboxes in the furniture's frame (blocks) */
  hitboxes: Array<{ min: Vec3; max: Vec3 }>;
  /** Seats in the furniture's frame (blocks) */
  seats: Vec3[];
}

/**
 * Shows the furniture on the stage with a ground grid of 5 × 5 blocks (the furniture stands on the middle one) and
 * frames the camera on it, if `frame` (edits of the shown furniture keep the camera where the user put it).
 *
 * @returns removes the furniture again and frees its resources
 */
export function showFurniture(stage: Stage, scene: FurnitureScene, frame = true): () => void {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  for (const element of scene.elements) {
    const holder = new THREE.Group();
    holder.matrixAutoUpdate = false;
    holder.matrix.fromArray(element.matrix);
    if (element.model && element.model.kind !== 'empty') {
      const object = createModelObject(element.model, element.display, stage.render);
      holder.add(object.root);
      disposables.push(object);
    } else {
      const geometry = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
      const material = new THREE.MeshBasicMaterial({ color: 0x8a8fa8, transparent: true, opacity: 0.55 });
      holder.add(new THREE.Mesh(geometry, material));
      disposables.push(geometry, material);
    }
    root.add(holder);
  }

  const hitboxMaterial = new THREE.LineBasicMaterial({ color: 0xf2b84b });
  disposables.push(hitboxMaterial);
  for (const { min, max } of scene.hitboxes) {
    const [x0, y0, z0] = furniturePoint(min);
    const [x1, y1, z1] = furniturePoint(max);
    const solid = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    const geometry = new THREE.EdgesGeometry(solid);
    solid.dispose();
    const box = new THREE.LineSegments(geometry, hitboxMaterial);
    box.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    root.add(box);
    disposables.push(geometry);
  }

  const seatGeometry = new THREE.SphereGeometry(1.5, 12, 8);
  const seatMaterial = new THREE.MeshBasicMaterial({ color: 0x4bb3f2 });
  disposables.push(seatGeometry, seatMaterial);
  for (const seat of scene.seats) {
    const marker = new THREE.Mesh(seatGeometry, seatMaterial);
    marker.position.set(...furniturePoint(seat));
    root.add(marker);
  }

  const grid = new THREE.GridHelper(5 * BLOCK, 5, 0x54766a, 0x1f302a);
  disposables.push(grid);
  stage.scene.add(root, grid);
  root.updateMatrixWorld(true);

  if (frame) {
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) box.set(new THREE.Vector3(-8, 0, -8), new THREE.Vector3(8, 16, 8));
    stage.frame(box, new THREE.Vector3(1, 0.75, 1.15));
  } else stage.render();

  return () => {
    stage.scene.remove(root, grid);
    disposables.forEach((d) => d.dispose());
    stage.render();
  };
}
