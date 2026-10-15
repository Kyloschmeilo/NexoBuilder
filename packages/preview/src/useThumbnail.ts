/** Small inventory-style thumbnails for the tree and the editors, rendered one at a time with a shared renderer. */
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import type { ImportedModel, JavaDisplayTransform } from '@resourcepackbuilder/core/model/types';
import { buildPreviewModel, resolveTextureRef } from './modelGeometry';
import { createModelObject } from './threeModel';

const SIZE = 96;

/** Default view of blocks in the inventory (block/block.json) */
const DEFAULT_GUI: JavaDisplayTransform = { rotation: [30, 225, 0], translation: [0, 0, 0], scale: [0.625, 0.625, 0.625] };

/** Finished thumbnails (`null` = the model has nothing to show). */
const cache = new WeakMap<ImportedModel, string | null>();
const pending = new WeakMap<ImportedModel, Promise<string | null>>();
/** Renders run one after another on the shared renderer. */
let queue: Promise<unknown> = Promise.resolve();
/** `null` once WebGL turned out to be unavailable. */
let sharedRenderer: THREE.WebGLRenderer | null | undefined;

function getRenderer(): THREE.WebGLRenderer | null {
  if (sharedRenderer !== undefined) return sharedRenderer;
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    // After a context loss the renderer is useless; the next thumbnail creates a fresh one.
    renderer.domElement.addEventListener(
      'webglcontextlost',
      () => {
        if (sharedRenderer === renderer) sharedRenderer = undefined;
        renderer.dispose();
      },
      { once: true },
    );
    sharedRenderer = renderer;
  } catch {
    sharedRenderer = null;
  }
  return sharedRenderer;
}

async function renderElements(model: ImportedModel, preview: ReturnType<typeof buildPreviewModel>): Promise<string | null> {
  const renderer = getRenderer();
  if (!renderer) return null;
  const display = (model.json.display?.gui as JavaDisplayTransform | undefined) ?? DEFAULT_GUI;
  const object = createModelObject(preview, display);
  try {
    await object.ready;
    const scene = new THREE.Scene();
    scene.add(object.root);
    const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 200);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  } finally {
    object.dispose();
  }
}

/** Renders (or returns the cached) thumbnail of `model` as a PNG data URL; `null` when there is nothing to show. */
function renderThumbnail(model: ImportedModel): Promise<string | null> {
  if (cache.has(model)) return Promise.resolve(cache.get(model) ?? null);
  const existing = pending.get(model);
  if (existing) return existing;

  const preview = buildPreviewModel(model);
  let result: Promise<string | null>;
  if (preview.kind === 'generated') {
    const layer0 = model.json.textures?.layer0;
    result = Promise.resolve(layer0 ? (resolveTextureRef(model, layer0).texture?.dataUrl ?? null) : null);
  } else if (preview.kind === 'empty') {
    result = Promise.resolve(null);
  } else {
    result = queue.then(() => renderElements(model, preview));
    queue = result.catch(() => undefined);
  }
  const settled = result.then(
    (url) => {
      cache.set(model, url);
      return url;
    },
    // A failed render (e.g. a lost context) is not cached, so a later request tries again.
    () => null,
  );
  pending.set(model, settled);
  void settled.finally(() => pending.delete(model));
  return settled;
}

/** The thumbnail of `model` (PNG data URL), or `null` while rendering or when there is nothing to show. */
export function useThumbnail(model: ImportedModel | null): string | null {
  const [rendered, setRendered] = useState<{ model: ImportedModel; url: string | null } | null>(null);
  useEffect(() => {
    if (!model || cache.has(model)) return;
    let isCurrent = true;
    void renderThumbnail(model).then((url) => {
      if (isCurrent) setRendered({ model, url });
    });
    return () => {
      isCurrent = false;
    };
  }, [model]);
  if (!model) return null;
  if (cache.has(model)) return cache.get(model) ?? null;
  return rendered?.model === model ? rendered.url : null;
}
