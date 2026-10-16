/** The interactive three.js scene of the model preview: created once per mount, models are swapped in with showModel. */
import type { JavaDisplayTransform } from '@resourcepackbuilder/minecraft';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PreviewModel } from './modelGeometry';
import { createModelObject } from './threeModel';

export interface Stage {
  scene: THREE.Scene;
  /** Renders one frame (no-op once disposed). */
  render: () => void;
  /** Points the camera at `box` from `direction` and resets the orbit. */
  frame: (box: THREE.Box3, direction: THREE.Vector3) => void;
  dispose: () => void;
}

/**
 * Creates renderer, camera and orbit controls inside `container`. Frames are only rendered on demand:
 * while the user drags or the damping still moves the camera, plus on resize and explicit `render()`.
 *
 * @throws when WebGL is unavailable
 */
export function createStage(container: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;

  let disposed = false;
  let contextLost = false;
  const render = () => {
    if (!disposed && !contextLost) renderer.render(scene, camera);
  };

  // Damping loop: runs while the user interacts and until the camera has come to rest
  let frameId = 0;
  let interacting = false;
  const tick = () => {
    frameId = 0;
    const moving = controls.update(); // dispatches 'change' (→ render) while the camera moves
    if (moving || interacting) schedule();
  };
  const schedule = () => {
    if (!frameId && !disposed) frameId = requestAnimationFrame(tick);
  };
  const onStart = () => {
    interacting = true;
    schedule();
  };
  const onEnd = () => {
    interacting = false;
    schedule();
  };
  controls.addEventListener('change', render);
  controls.addEventListener('start', onStart);
  controls.addEventListener('end', onEnd);

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // A lost context (GPU reset, too many contexts) is restored by the browser when the default is prevented;
  // three.js re-uploads all resources on the next render.
  const onContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
  };
  const onContextRestored = () => {
    contextLost = false;
    render();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  return {
    scene,
    render,
    frame: (box, direction) => {
      const center = box.getCenter(new THREE.Vector3());
      const distance = Math.max(box.getSize(new THREE.Vector3()).length(), 12) * 1.35;
      camera.position.copy(center).add(direction.clone().normalize().multiplyScalar(distance));
      controls.target.copy(center);
      controls.update();
      render();
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

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

/**
 * Shows `preview` on the stage (in the display slot `displayTransform`, if given) and frames the camera on it.
 * Blocks without a display slot get a ground grid and block outline.
 *
 * @returns removes the model again and frees its resources
 */
export function showModel(stage: Stage, preview: PreviewModel, displayTransform?: JavaDisplayTransform): () => void {
  if (preview.kind === 'empty') return () => {};
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
}
