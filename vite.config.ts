import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const root = resolve(__dirname, 'src/ui');
const outDir = resolve(__dirname, 'dist');

/**
 * Vite has no concept of an extension manifest, so it is copied verbatim after
 * the bundle is written. Keeping it a plain file (rather than generating it)
 * means what ships is exactly what is reviewable in the repo.
 */
function manifestPlugin(): Plugin {
  return {
    name: 'copy-manifest',
    closeBundle() {
      mkdirSync(outDir, { recursive: true });
      copyFileSync(resolve(__dirname, 'src/manifest.json'), resolve(outDir, 'manifest.json'));
    },
  };
}

export default defineConfig({
  root,
  plugins: [manifestPlugin()],
  build: {
    outDir,
    emptyOutDir: true,
    // MV3 forbids remote code and inline script; a plain ES module graph with
    // no code-splitting keeps the CSP story trivial.
    target: 'chrome116',
    modulePreload: false,
    rollupOptions: {
      input: { popup: resolve(root, 'popup.html') },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
});
