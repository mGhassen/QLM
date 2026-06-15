import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
    },
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    // Container boot takes 20–60s on a cold image pull; individual hooks
    // override this further where needed.
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
  resolve: {
    alias: {
      '@guepard/extensions-sdk': path.resolve(
        __dirname,
        '../../extensions-sdk/src',
      ),
    },
  },
});
