import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCcw } from 'lucide-react';
import type { ImportedModel, JavaDisplayTransform } from '@nexobuilder/core/types';
import { buildPreviewModel, type PreviewModel } from './modelGeometry';
import { createModelObject } from './threeModel';

const DISPLAY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'none', label: 'Modell' },
  { value: 'gui', label: 'Inventar (GUI)' },
  { value: 'thirdperson_righthand', label: 'In der Hand (3. Person)' },
  { value: 'firstperson_righthand', label: 'In der Hand (1. Person)' },
  { value: 'head', label: 'Auf dem Kopf' },
  { value: 'ground', label: 'Auf dem Boden' },
  { value: 'fixed', label: 'Rahmen / Möbel (fixed)' },
];

interface ModelPreviewProps {
  model: ImportedModel;
  height?: number;
  showToolbar?: boolean;
}

export function ModelPreview({ model, height = 340, showToolbar = true }: ModelPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState('none');
  const [resetCounter, setResetCounter] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo<PreviewModel>(() => buildPreviewModel(model), [model]);
  const displayTransform = display === 'none' ? undefined : (model.json.display?.[display] as JavaDisplayTransform | undefined);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || preview.kind === 'empty') return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError('3D-Vorschau nicht verfügbar (WebGL wird von diesem Browser nicht unterstützt).');
      return;
    }
    setError(null);
    let disposed = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;

    const render = () => {
      if (!disposed) renderer.render(scene, camera);
    };
    const object = createModelObject(preview, displayTransform, render);
    scene.add(object.root);

    const extras: Array<{ dispose: () => void }> = [];
    if (!displayTransform && preview.kind === 'elements') {
      // Bodenraster und Block-Umriss (ein Block = 16 Pixel)
      const grid = new THREE.GridHelper(16, 16, 0x54766a, 0x1f302a);
      grid.position.y = -8;
      scene.add(grid);
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(16, 16, 16)),
        new THREE.LineBasicMaterial({ color: 0x54766a, transparent: true, opacity: 0.6 }),
      );
      scene.add(outline);
      extras.push(grid.geometry, grid.material as THREE.Material, outline.geometry, outline.material as THREE.Material);
    }

    // Kamera an das Modell anpassen
    const box = new THREE.Box3().setFromObject(object.root);
    if (box.isEmpty()) box.set(new THREE.Vector3(-8, -8, -8), new THREE.Vector3(8, 8, 8));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const distance = Math.max(size, 12) * 1.35;
    const direction =
      preview.kind === 'generated' && !displayTransform ? new THREE.Vector3(0, 0.12, 1) : new THREE.Vector3(1, 0.75, 1.15);
    camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));
    controls.target.copy(center);
    controls.update();

    const resize = () => {
      const width = container.clientWidth;
      const h = container.clientHeight;
      if (!width || !h) return;
      renderer.setSize(width, h, false);
      camera.aspect = width / h;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (controls.update()) render();
    };
    loop();
    controls.addEventListener('change', render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      object.dispose();
      extras.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [preview, displayTransform, resetCounter]);

  const hasDisplay = (slot: string) => slot === 'none' || !!model.json.display?.[slot];

  return (
    <div className="preview-3d" style={{ height }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {(preview.kind === 'empty' || error) && <div className="preview-note">{error ?? preview.note}</div>}
      {showToolbar && preview.kind !== 'empty' && !error && (
        <div className="preview-toolbar">
          <select className="select" value={display} onChange={(e) => setDisplay(e.target.value)} title="Ansicht">
            {DISPLAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} disabled={!hasDisplay(o.value)}>
                {o.label}
                {!hasDisplay(o.value) ? ' (nicht definiert)' : ''}
              </option>
            ))}
          </select>
          <span className="spacer" />
          <button className="btn small icon" title="Ansicht zurücksetzen" onClick={() => setResetCounter((c) => c + 1)}>
            <RotateCcw size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
