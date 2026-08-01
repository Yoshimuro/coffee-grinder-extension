import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // The bundle has to run from `file://` inside a Capacitor WebView (BJ-6), so
  // every emitted reference is relative rather than root-absolute.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Android WebView floor for Capacitor 6.
    target: 'es2022',
    // The font faces must stay as real files: inlining them as data URIs would
    // push the CSS past a megabyte and defeat per-subset caching.
    assetsInlineLimit: 4096,
  },
});
