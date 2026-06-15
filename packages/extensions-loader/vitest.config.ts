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
      '@guepard/extensions-loader': path.resolve(__dirname, './src'),
    },
  },
});
