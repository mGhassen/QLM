import * as path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
    },
    environment: 'node',
  },
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, '../domain/src'),
      '@guepard/extensions-sdk': path.resolve(__dirname, './src'),
    },
  },
});
