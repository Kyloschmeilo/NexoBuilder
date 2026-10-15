/** Small thumbnails (like in the inventory) for the tree and editor – with a shared renderer. */
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import type { ImportedModel, JavaDisplayTransform } from '@resourcepackbuilder/core/types';
import { buildPreviewModel, resolveTextureRef } from './modelGeometry';
import { createModelObject } from './threeModel';

const SIZE = 96;
const cache = new WeakMap<ImportedModel, string | null>();
const pending = new WeakMap<ImportedModel, Promise<string | null>>();
let renderer: THREE.WebGLRenderer | null | undefined;
let queue: Promise<unknown> = Promise.resolve();

/** Default view of blocks in the inventory (block/block.json) */
const DEFAULT_GUI: JavaDisplayTransform = { rotation: [30, 225, 0], translation: [0, 0, 0], scale: [0.625, 0.625, 0.625] };

function getRenderer(): THREE.WebGLRenderer | null {
  if (renderer !== undefined) return renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch {
    renderer = null;
  }
  return renderer;
}

export function renderThumbnail(model: ImportedModel): Promise<string | null> {
  if (cache.has(model)) return Promise.resolve(cache.get(model)!);
  const existing = pending.get(model);
  if (existing) return existing;

  const preview = buildPreviewModel(model);
  if (preview.kind === 'generated') {
    const layer0 = model.json.textures?.layer0;
    const url = layer0 ? (resolveTextureRef(model, layer0).texture?.dataUrl ?? null) : null;
    cache.set(model, url);
    return Promise.resolve(url);
  }
  if (preview.kind === 'empty') {
    cache.set(model, null);
    return Promise.resolve(null);
  }

  const job = queue.then(async () => {
    const r = getRenderer();
    if (!r) return null;
    const display = (model.json.display?.gui as JavaDisplayTransform | undefined) ?? DEFAULT_GUI;
    const object = createModelObject(preview, display);
    await object.ready;
    const scene = new THREE.Scene();
    scene.add(object.root);
    const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 200);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    r.setClearColor(0x000000, 0);
    r.render(scene, camera);
    const url = r.domElement.toDataURL('image/png');
    object.dispose();
    return url;
  });
  const result = job.catch(() => null);
  queue = result;
  pending.set(model, result);
  void result.then((url) => cache.set(model, url));
  return result;
}

export function useThumbnail(model: ImportedModel | null): string | null {
  const [url, setUrl] = useState<string | null>(() => (model && cache.has(model) ? cache.get(model)! : null));
  useEffect(() => {
    let active = true;
    if (!model) {
      setUrl(null);
      return;
    }
    if (cache.has(model)) {
      setUrl(cache.get(model)!);
      return;
    }
    void renderThumbnail(model).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [model]);
  return url;
}
