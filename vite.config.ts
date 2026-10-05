/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Bettet im Modus "single" alle JS- und CSS-Dateien direkt in die index.html ein.
 * Das Ergebnis (dist-single/index.html) kann ohne Server per Doppelklick geöffnet werden.
 */
function singleFilePlugin(): Plugin {
  return {
    name: 'nexobuilder-single-file',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlFile = Object.values(bundle).find(
        (file) => file.type === 'asset' && file.fileName.endsWith('.html'),
      );
      if (!htmlFile || htmlFile.type !== 'asset') return;
      let html = String(htmlFile.source);

      for (const [fileName, file] of Object.entries(bundle)) {
        if (file.type === 'chunk') {
          const scriptTag = new RegExp(
            `<script type="module"[^>]*src="[^"]*${escapeRegExp(fileName)}"[^>]*></script>`,
          );
          const code = file.code.replace(/<\/script/gi, '<\\/script');
          if (scriptTag.test(html)) {
            html = html.replace(scriptTag, () => `<script type="module">${code}</script>`);
            delete bundle[fileName];
          }
        } else if (fileName.endsWith('.css')) {
          const linkTag = new RegExp(`<link rel="stylesheet"[^>]*href="[^"]*${escapeRegExp(fileName)}"[^>]*>`);
          if (linkTag.test(html)) {
            const css = String(file.source).replace(/<\/style/gi, '<\\/style');
            html = html.replace(linkTag, () => `<style>${css}</style>`);
            delete bundle[fileName];
          }
        }
      }
      htmlFile.source = html;
    },
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: [react(), ...(single ? [singleFilePlugin()] : [])],
    build: single
      ? {
          outDir: 'dist-single',
          assetsInlineLimit: Number.MAX_SAFE_INTEGER,
          cssCodeSplit: false,
          chunkSizeWarningLimit: 5000,
        }
      : {
          outDir: 'dist',
          chunkSizeWarningLimit: 2000,
        },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
