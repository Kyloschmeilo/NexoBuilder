// Fails when a tracked text file is not valid UTF-8 (e.g. cp1252 dashes pasted from another editor).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Files that are not text. */
const BINARY_EXTENSIONS = /\.(png|ico|icns|gif|jpe?g|webp|woff2?|ttf|ogg|zip|jar|exe)$/i;

const decoder = new TextDecoder('utf-8', { fatal: true });
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);

const invalid = files.filter((file) => {
  if (BINARY_EXTENSIONS.test(file)) return false;
  const bytes = readFileSync(file);
  try {
    decoder.decode(bytes);
    return false;
  } catch {
    return true;
  }
});

if (invalid.length > 0) {
  console.error(`Not valid UTF-8:\n${invalid.map((file) => `  ${file}`).join('\n')}`);
  process.exit(1);
}
console.log(`${files.length} files checked, all text files are valid UTF-8.`);
