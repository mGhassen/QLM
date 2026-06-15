import eslintConfigBase from '@guepard/eslint-config/base.js';

export default [
  ...eslintConfigBase,
  {
    ignores: [
      'node_modules',
      'dist',
      'test-results',
      'playwright-report',
    ],
  },
];
