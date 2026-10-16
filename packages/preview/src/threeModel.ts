/** Builds a three.js group from a PreviewModel (for the preview and thumbnails). */
import * as THREE from 'three';
import type { JavaDisplayTransform, ModelTexture } from '@resourcepackbuilder/core/model/types';
import type { PreviewModel } from './modelGeometry';

export interface ModelObject {
  root: THREE.Group;
  /** Resolves once all textures are loaded (or failed, or the object was disposed) */
  ready: Promise<void>;
  /** Frees GPU resources and cancels texture loads still in flight */
  dispose: () => void;
}

export function createModelObject(preview: PreviewModel, display?: JavaDisplayTransform, onTextureLoad?: () => void): ModelObject {
  const disposables: Array<{ dispose: () => void }> = [];
  const textureCache = new Map<string, THREE.Texture>();
  const materialCache = new Map<string, THREE.Material>();
  const loading: Array<Promise<void>> = [];
  const pendingLoads = new Set<{ image: HTMLImageElement; settle: () => void }>();

  const loadTexture = (tex: ModelTexture): THREE.Texture => {
    const cached = textureCache.get(tex.id);
    if (cached) return cached;
    const image = new Image();
    const texture = new THREE.Texture(image);
    loading.push(
      new Promise<void>((resolve) => {
        const load = {
          image,
          settle: () => {
            image.onload = image.onerror = null;
            pendingLoads.delete(load);
            resolve();
          },
        };
        pendingLoads.add(load);
        image.onload = () => {
          load.settle();
          texture.needsUpdate = true;
          onTextureLoad?.();
        };
        image.onerror = load.settle;
      }),
    );
    image.src = tex.dataUrl;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(tex.id, texture);
    disposables.push(texture);
    return texture;
  };

  let missingTexture: THREE.Texture | null = null;
  const getMissingTexture = () => {
    if (missingTexture) return missingTexture;
    // Minecraft's missing texture: a 2×2 magenta/black checkerboard
    const M = [0xf8, 0x00, 0xf8, 0xff];
    const K = [0x00, 0x00, 0x00, 0xff];
    missingTexture = new THREE.DataTexture(new Uint8Array([...M, ...K, ...K, ...M]), 2, 2);
    missingTexture.needsUpdate = true;
    missingTexture.magFilter = THREE.NearestFilter;
    missingTexture.minFilter = THREE.NearestFilter;
    missingTexture.colorSpace = THREE.SRGBColorSpace;
    disposables.push(missingTexture);
    return missingTexture;
  };

  const getMaterial = (tex: ModelTexture | null, unresolved: string | null, shade: number, doubleSided: boolean) => {
    const kind = tex ? tex.id : unresolved && !unresolved.startsWith('#') ? 'vanilla' : 'missing';
    const key = `${kind}|${shade}|${doubleSided}`;
    const cached = materialCache.get(key);
    if (cached) return cached;
    const side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
    let material: THREE.Material;
    if (tex) {
      material = new THREE.MeshBasicMaterial({ map: loadTexture(tex), color: new THREE.Color(shade, shade, shade), alphaTest: 0.05, side });
    } else if (kind === 'vanilla') {
      // Vanilla texture that is not available in the browser
      material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55 * shade, 0.57 * shade, 0.66 * shade), side });
    } else {
      material = new THREE.MeshBasicMaterial({ map: getMissingTexture(), color: new THREE.Color(shade, shade, shade), side });
    }
    materialCache.set(key, material);
    disposables.push(material);
    return material;
  };

  // Minecraft coordinates 0–16 with center 8,8,8
  const root = new THREE.Group();
  const modelGroup = new THREE.Group();
  modelGroup.position.set(-8, -8, -8);
  root.add(modelGroup);
  for (const el of preview.elements) {
    const pivot = new THREE.Group();
    pivot.position.set(...el.origin);
    pivot.rotation.order = 'ZYX';
    pivot.rotation.set(
      THREE.MathUtils.degToRad(el.rotation.x),
      THREE.MathUtils.degToRad(el.rotation.y),
      THREE.MathUtils.degToRad(el.rotation.z),
    );
    pivot.scale.set(...el.scale);
    for (const face of el.faces) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(face.positions.flat(), 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(face.uvs.flat(), 2));
      geometry.setIndex([0, 2, 1, 2, 3, 1]);
      disposables.push(geometry);
      pivot.add(new THREE.Mesh(geometry, getMaterial(face.texture, face.unresolved, face.shade, !!face.doubleSided)));
    }
    modelGroup.add(pivot);
  }

  // Display transformation (like in Blockbench display mode)
  if (display) {
    const [tx, ty, tz] = display.translation ?? [0, 0, 0];
    const [rx, ry, rz] = display.rotation ?? [0, 0, 0];
    const [sx, sy, sz] = display.scale ?? [1, 1, 1];
    root.position.set(tx, ty, tz);
    root.rotation.order = 'XYZ';
    root.rotation.set(THREE.MathUtils.degToRad(rx), THREE.MathUtils.degToRad(ry), THREE.MathUtils.degToRad(rz));
    root.scale.set(sx, sy, sz);
  }

  return {
    root,
    ready: Promise.all(loading).then(() => undefined),
    dispose: () => {
      for (const load of [...pendingLoads]) {
        load.image.src = '';
        load.settle();
      }
      disposables.forEach((d) => d.dispose());
    },
  };
}
