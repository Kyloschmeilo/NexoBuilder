/**
 * Overrides for the automated end-to-end test (`scripts/test-windows-exe.cjs`). They are honoured only when
 * `RESOURCEPACKBUILDER_E2E=1` is set, so a stray environment variable never changes a normal installation.
 *
 * The e2e test drives the very installer that is released (CI tests the artifact it publishes), so the hooks cannot
 * be compiled out of release builds. That is acceptable because they cross no privilege boundary: whoever can set
 * environment variables for the user's process can already read and write everything the hooks point to. The hooks
 * only redirect where files go and skip dialogs; none of them is ever persisted (e.g. the test share folder is
 * allowed for the running session only).
 */

const enabled = process.env.RESOURCEPACKBUILDER_E2E === '1';

const env = (name: string): string | null => (enabled && process.env[`RESOURCEPACKBUILDER_${name}`]) || null;

export const testHooks = Object.freeze({
  /** Save downloads (exports, project files) here without a "Save as" dialog. */
  downloadDir: env('DOWNLOAD_DIR'),
  /** Use this folder instead of asking for a shared folder. */
  shareDir: env('TEST_SHARE_DIR'),
  /** Root folder of the test server instead of `<userData>/testserver`. */
  testServerDir: env('TESTSERVER_DIR'),
  /** Use this Paper JAR instead of downloading one. */
  paperJar: env('TEST_PAPER_JAR'),
  /** The only Minecraft version offered while `paperJar` is set. */
  paperVersion: env('TEST_PAPER_VERSION') ?? '1.21.11',
  /** Use this Nexo JAR instead of asking for one. */
  nexoJar: env('TEST_NEXO_JAR'),
  /** Ignore the system Java so the Java download gets tested. */
  ignoreSystemJava: env('TEST_IGNORE_SYSTEM_JAVA') !== null,
});
