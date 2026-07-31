import { defineConfig } from 'vitest/config';

// Standalone rather than merged with vite.config.ts: that config sets
// `root: src/ui` so the extension bundle resolves, which would hide the tests.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
});
