import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.ts'],
    },
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
});
