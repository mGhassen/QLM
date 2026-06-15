import baseConfig from '@qlm/eslint-config/base.js';

export default [
  ...baseConfig,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];
