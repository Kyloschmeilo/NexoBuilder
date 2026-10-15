// @ts-check
/**
 * Overrides for the automated end-to-end test (`scripts/test-windows-exe.cjs`). They are honoured only when
 * `RESOURCEPACKBUILDER_E2E=1` is set, so a stray environment variable never changes a normal installation.
 */

const enabled = process.env.RESOURCEPACKBUILDER_E2E === '1';

/** @param {string} name */
const env = (name) => (enabled && process.env[`RESOURCEPACKBUILDER_${name}`]) || null;

const testHooks = Object.freeze({
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

module.exports = { testHooks };
