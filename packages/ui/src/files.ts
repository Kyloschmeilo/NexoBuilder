/** Browser helpers for files (reading via drag & drop, downloading). */
import type { DroppedFile } from '@resourcepackbuilder/core/model/textures';

const TEXT_EXTENSIONS = /\.(json|bbmodel|mcmeta|yml|yaml|txt)$/i;

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read file`));
    reader.readAsDataURL(file);
  });
}

export function readAsText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read file`));
    reader.readAsText(file);
  });
}

/** Reads dropped files: PNGs as data URL, models/metadata as text. */
export async function readDroppedFiles(files: File[]): Promise<DroppedFile[]> {
  const result: DroppedFile[] = [];
  for (const file of files) {
    if (/\.png$/i.test(file.name) || file.type === 'image/png') {
      let dataUrl = await readAsDataUrl(file);
      // Some systems provide no MIME type – correct it in that case
      if (dataUrl.startsWith('data:application/octet-stream')) dataUrl = dataUrl.replace('data:application/octet-stream', 'data:image/png');
      result.push({ name: file.name, dataUrl });
    } else if (TEXT_EXTENSIONS.test(file.name)) {
      result.push({ name: file.name, text: await readAsText(file) });
    } else {
      result.push({ name: file.name });
    }
  }
  return result;
}

/** Collects files from a drop event (including files in dropped folders). */
export async function filesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const items = [...dataTransfer.items].filter((i) => i.kind === 'file');
  const entries = items.map((i) => (typeof i.webkitGetAsEntry === 'function' ? i.webkitGetAsEntry() : null));
  if (entries.some((e) => e?.isDirectory)) {
    const files: File[] = [];
    for (const entry of entries) if (entry) await collectEntry(entry, files);
    return files;
  }
  return [...dataTransfer.files];
}

async function collectEntry(entry: FileSystemEntry, files: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    files.push(file);
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    let batch: FileSystemEntry[] = [];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      for (const child of batch) await collectEntry(child, files);
    } while (batch.length > 0);
  }
}

export function downloadBytes(data: Uint8Array | string, fileName: string, mime: string) {
  const part: BlobPart = typeof data === 'string' ? data : (data as Uint8Array<ArrayBuffer>);
  const blob = new Blob([part], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function pickFiles(accept: string, multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve(input.files ? [...input.files] : []);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

/** Turns "ruby_sword.bbmodel" into a readable name ("Ruby Sword"). */
export function prettyNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return base.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
