import eslintConfigBase from '@guepard/eslint-config/base.js';
import { defineConfig } from 'eslint/config';

export default defineConfig(eslintConfigBase, {
  ignores: ['**/shadcn/**', '**/ai-elements/**'],
});
