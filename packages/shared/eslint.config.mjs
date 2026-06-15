import eslintConfigBase from '@qlm/eslint-config/base.js';

export default [
  ...eslintConfigBase,
  {
    ignores: ['**/*.js', '**/*.js.map'],
  },
];
