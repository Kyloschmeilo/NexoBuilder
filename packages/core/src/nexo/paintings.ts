/**
 * Eigene Gemälde (Nexo: configuration/custom-paintings) – Textur unter
 * assets/<ns>/textures/painting/<id>.png plus Eintrag in plugins/Nexo/paintings.yml.
 * Nexo erzeugt daraus ab Minecraft 1.21.5 das nötige Datapack.
 */
import type { Issue, Project } from '../types';
import { compareVersions, ITEM_ID_PATTERN } from '../util';

export interface PaintingFile {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface Painting {
  id: string;
  /** Schlüssel, z.B. "sonnenuntergang" – verwendet als <namespace>:<paintingId> */
  paintingId: string;
  title: string;
  author: string;
  /** Größe in Blöcken */
  width: number;
  height: number;
  /** Auch zufällig beim Aufhängen normaler Gemälde auswählen */
  randomPlace: boolean;
  file: PaintingFile | null;
  /** Animiert: Bild enthält mehrere Bilder untereinander */
  animated: boolean;
  frametime: number;
}

export function createPainting(id: string, paintingId: string, file: PaintingFile | null): Painting {
  // Größe in Blöcken aus dem Bild schätzen (16 Pixel pro Block)
  const blocks = (px: number) => Math.min(16, Math.max(1, Math.round(px / 16)));
  return {
    id,
    paintingId,
    title: '',
    author: '',
    width: file ? blocks(file.width) : 1,
    height: file ? blocks(file.height) : 1,
    randomPlace: false,
    file,
    animated: false,
    frametime: 2,
  };
}

export function paintingKey(project: Project, painting: Painting): string {
  return `${project.namespace}:${painting.paintingId}`;
}

export function paintingTexturePath(project: Project, painting: Painting): string {
  return `assets/${project.namespace}/textures/painting/${painting.paintingId}.png`;
}

/** Größe eines Einzelbilds bei animierten Gemälden (gleiches Seitenverhältnis wie das Gemälde) */
export function paintingFrameSize(painting: Painting): { width: number; height: number; frames: number } | null {
  if (!painting.file) return null;
  const width = painting.file.width;
  const height = Math.round((width * painting.height) / painting.width);
  if (height <= 0) return null;
  return { width, height, frames: Math.floor(painting.file.height / height) };
}

export function paintingMcmeta(painting: Painting): Record<string, unknown> | null {
  if (!painting.animated) return null;
  const frame = paintingFrameSize(painting);
  if (!frame || frame.frames < 2) return null;
  return { animation: { width: frame.width, height: frame.height, frametime: Math.max(1, Math.round(painting.frametime)) } };
}

/** Eintrag für paintings.yml */
export function paintingToYaml(project: Project, painting: Painting): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (painting.author.trim()) out.author = painting.author.trim();
  if (painting.title.trim()) out.title = painting.title.trim();
  out.asset_id = paintingKey(project, painting);
  out.width = painting.width;
  out.height = painting.height;
  if (painting.randomPlace) out.random_place = true;
  return out;
}

export function validatePaintings(project: Project): Array<Issue & { paintingId: string }> {
  const issues: Array<Issue & { paintingId: string }> = [];
  const paintings = project.paintings ?? [];
  if (paintings.length > 0 && compareVersions(project.settings.minecraftVersion, '1.21.5') < 0) {
    issues.push({
      level: 'warning',
      message: 'Nexo erzeugt das Datapack für eigene Gemälde erst ab Minecraft 1.21.5 – für ältere Versionen musst du es selbst anlegen.',
      paintingId: paintings[0].id,
    });
  }
  const seen = new Set<string>();
  for (const painting of paintings) {
    const add = (level: Issue['level'], message: string) =>
      issues.push({ level, message: `Gemälde „${painting.paintingId || '?'}“: ${message}`, paintingId: painting.id });
    if (!ITEM_ID_PATTERN.test(painting.paintingId)) add('error', 'Die ID darf nur Kleinbuchstaben, Zahlen und _ enthalten.');
    if (seen.has(painting.paintingId)) add('error', 'Diese ID hat schon ein anderes Gemälde.');
    seen.add(painting.paintingId);
    for (const [label, value] of [
      ['Breite', painting.width],
      ['Höhe', painting.height],
    ] as const) {
      if (!Number.isInteger(value) || value < 1 || value > 16) add('error', `Die ${label} muss zwischen 1 und 16 Blöcken liegen.`);
    }
    if (!painting.file) {
      add('error', 'Es wurde noch kein Bild (PNG) hochgeladen.');
      continue;
    }
    const frame = paintingFrameSize(painting);
    if (painting.animated) {
      if (!frame || frame.frames < 2 || painting.file.height % frame.height !== 0) {
        add('error', `Für eine Animation müssen mehrere Bilder im Seitenverhältnis ${painting.width}:${painting.height} untereinander liegen.`);
      }
    } else {
      const expected = painting.file.width / painting.width;
      if (Math.abs(painting.file.height / painting.height - expected) > 0.01) {
        add('warning', `Das Bild (${painting.file.width}×${painting.file.height}) passt nicht zum Seitenverhältnis ${painting.width}×${painting.height} Blöcke – es wird verzerrt.`);
      }
    }
  }
  return issues;
}
