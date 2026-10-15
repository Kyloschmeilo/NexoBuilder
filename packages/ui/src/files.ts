/** Browser helpers for files: reading, picking, collecting dropped folders and downloading. */

function readWith(read: (reader: FileReader) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    read(reader);
  });
}

/** Reads a file as text. */
export function readAsText(file: Blob): Promise<string> {
  return readWith((reader) => reader.readAsText(file));
}

/**
 * Reads a file as a data URL with the given MIME type. Systems often report no or a generic type
 * (`application/octet-stream`), so the type the caller knows is set explicitly.
 */
export async function readAsDataUrl(file: Blob, mime: string): Promise<string> {
  const dataUrl = await readWith((reader) => reader.readAsDataURL(file));
  return dataUrl.replace(/^data:[^;,]*/, `data:${mime}`);
}

/** Reads a PNG file as an `image/png` data URL. */
export function readPngAsDataUrl(file: Blob): Promise<string> {
  return readAsDataUrl(file, 'image/png');
}

/** The file name without its last extension: `ruby_sword.bbmodel` → `ruby_sword`. */
export function fileStem(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

/** Collects the files of a drop, descending into dropped folders. */
export async function filesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const entries = [...dataTransfer.items].filter((item) => item.kind === 'file').map((item) => item.webkitGetAsEntry());
  if (!entries.some((entry) => entry?.isDirectory)) return [...dataTransfer.files];
  const files: File[] = [];
  for (const entry of entries) if (entry) await collectEntry(entry, files);
  return files;
}

function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile;
}

function isDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

async function collectEntry(entry: FileSystemEntry, files: File[]): Promise<void> {
  if (isFileEntry(entry)) {
    files.push(await new Promise<File>((resolve, reject) => entry.file(resolve, reject)));
  } else if (isDirectoryEntry(entry)) {
    const reader = entry.createReader();
    // readEntries returns the folder in batches until it yields an empty one
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (batch.length === 0) break;
      for (const child of batch) await collectEntry(child, files);
    }
  }
}

/** Opens the system file picker; resolves with the chosen files, or `[]` when the picker is cancelled. */
export function pickFiles(accept: string, multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.hidden = true;
    const finish = (files: File[]) => {
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', () => finish(input.files ? [...input.files] : []), { once: true });
    input.addEventListener('cancel', () => finish([]), { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

/** Saves `data` as a download named `fileName`. */
export function downloadBytes(data: Uint8Array | string, fileName: string, mime: string): void {
  // Copying into a fresh Uint8Array guarantees a plain ArrayBuffer (Blob rejects shared buffers)
  const part = typeof data === 'string' ? data : new Uint8Array(data);
  const url = URL.createObjectURL(new Blob([part], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // The download starts asynchronously; revoking right away can cancel it in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
