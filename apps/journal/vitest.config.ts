import { defineConfig } from 'vitest/config';

// Standalone rather than merged with vite.config.ts: the app config carries the
// React plugin and the asset pipeline, none of which the unit tests need.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
    // Dexie runs against fake-indexeddb (see tests/setup.ts); no DOM required
    // because the tests cover the store and the schema, not rendering.
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
});
