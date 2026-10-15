import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@resourcepackbuilder/ui/components/tooltip';
import type { ImportedModel, JavaDisplayTransform } from '@resourcepackbuilder/core/types';
import { buildPreviewModel, type PreviewModel } from './modelGeometry';
import { createModelObject } from './threeModel';

/** Display slots that can be previewed; labels live in the `preview.display` messages. */
const DISPLAY_OPTIONS = ['none', 'gui', 'thirdperson_righthand', 'firstperson_righthand', 'head', 'ground', 'fixed'] as const;

interface ModelPreviewProps {
  model: ImportedModel;
  height?: number;
  showToolbar?: boolean;
}

export function ModelPreview({ model, height = 340, showToolbar = true }: ModelPreviewProps) {
  const t = useTranslations('preview');
  const containerRef = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState('none');
  const [resetCounter, setResetCounter] = useState(0);
  const [webglError, setWebglError] = useState(false);
  const preview = useMemo<PreviewModel>(() => buildPreviewModel(model), [model]);
  const displayTransform = display === 'none' ? undefined : (model.json.display?.[display] as JavaDisplayTransform | undefined);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || preview.kind === 'empty') return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglError(true);
      return;
    }
    setWebglError(false);
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
      // Ground grid and block outline (one block = 16 pixels)
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

    // Fit the camera to the model
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

  const note = webglError
    ? t('webglUnavailable')
    : preview.kind === 'empty' && preview.note
      ? t(`notes.${preview.note.code}`, preview.note.params)
      : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-background" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full" />
      {(preview.kind === 'empty' || webglError) && (
        <div className="absolute inset-0 grid place-items-center p-5 text-center text-[13px] text-muted-foreground">{note}</div>
      )}
      {showToolbar && preview.kind !== 'empty' && !webglError && (
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-center gap-1.5 [&>*]:pointer-events-auto">
          <NativeSelect
            size="sm"
            className="max-w-[220px] bg-card [&_select]:text-xs"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="icon-sm" className="bg-card" aria-label={t('resetView')} onClick={() => setResetCounter((c) => c + 1)} />
              }
            >
              <RotateCcw />
            </TooltipTrigger>
            <TooltipContent>{t('resetView')}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
