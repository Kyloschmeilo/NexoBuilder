/** The name of a new shared folder, derived from the project name. */

/** Longest folder name derived from a project name (cloud services and old tools struggle with long paths). */
export const MAX_SHARE_FOLDER_NAME_LENGTH = 80;

/** Device names Windows reserves – also with an extension (`con.txt`) – which cannot be used as file or folder names. */
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;

/**
 * A folder name for `projectName` that every common file system accepts: invalid and control characters become `_`,
 * it is shortened to {@link MAX_SHARE_FOLDER_NAME_LENGTH} characters, has no leading or trailing spaces and no trailing
 * dots (Windows drops them), and a reserved Windows device name gets a `_` after its stem (`con.txt` → `con_.txt`).
 * Empty when nothing usable is left.
 */
export function shareFolderName(projectName: string): string {
  const name = projectName
    // eslint-disable-next-line no-control-regex -- control characters are invalid in file names
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .trim()
    .slice(0, MAX_SHARE_FOLDER_NAME_LENGTH)
    .replace(/[. ]+$/, '');
  return name.replace(WINDOWS_RESERVED_NAME, (_match, stem: string, extension: string | undefined) => `${stem}_${extension ?? ''}`);
}
